// Compartir un resultado (F3): con la imagen como archivo si el navegador lo
// admite (`navigator.canShare({ files })`), si no solo el texto, y si no hay
// `navigator.share`, «Descargar imagen» y «Copiar texto». La imagen se genera al
// mostrar el fin (o la ficha del día) y queda en memoria: «Compartir» llama a
// `share` sin esperas, porque Safari exige que siga reciente el toque (impacto,
// 2.3). Solo se comparte lo mínimo: el archivo y un `text` que ya lleva el enlace.
import { aPNG, lienzoDeImagen, type DatosImagen } from "./imagen.ts";

export type Compartido = "compartido" | "cancelado" | "sinPermiso" | "error";

/** Archivo vacío de prueba para `canShare`: solo cuenta el tipo. */
function archivoDePrueba(): File | null {
  try {
    return new File([new Uint8Array(0)], "torre-diaria.png", { type: "image/png" });
  } catch {
    return null;
  }
}

/** ¿Admite el navegador compartir una imagen PNG como archivo? */
export function puedeCompartirArchivos(): boolean {
  const prueba = archivoDePrueba();
  if (!prueba || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [prueba] });
  } catch {
    return false;
  }
}

/**
 * Comparte el texto (que ya lleva el enlace) y, si se admite, el archivo. Sin
 * `url`: con `text` y `url` a la vez algunas apps se quedan con uno de los
 * dos. Cancelar no es un error; sin permiso (el toque ya no cuenta), tampoco:
 * quien llama ofrece «Descargar imagen».
 */
export async function compartir(texto: string, archivo: File | null = null): Promise<Compartido> {
  try {
    const conArchivo = archivo !== null && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] });
    await navigator.share(conArchivo ? { files: [archivo], text: texto } : { text: texto });
    return "compartido";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelado";
    if (error instanceof DOMException && error.name === "NotAllowedError") return "sinPermiso";
    return "error";
  }
}

/** Descarga el PNG con un enlace temporal; la dirección `blob:` se revoca después. */
export function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.className = "fuera-de-vista";
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Algunos navegadores leen la dirección después del clic: se revoca un poco más tarde.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * La imagen de un resultado, preparada de antemano. `preparar` la dibuja (y
 * pinta la vista previa); `archivo` la da al momento si ya está, y `blob`
 * espera a que esté. Una preparación nueva deja sin efecto la anterior.
 */
export class ImagenCompartida {
  private vez = 0;
  private hecho: { blob: Blob; archivo: File; nombre: string } | null = null;
  private pendiente: Promise<Blob | null> = Promise.resolve(null);

  preparar(datos: DatosImagen, nombre: string, vistaPrevia: HTMLCanvasElement | null = null): void {
    const vez = ++this.vez;
    this.hecho = null;
    this.pendiente = (async () => {
      try {
        const lienzo = await lienzoDeImagen(datos);
        if (vez !== this.vez) return null;
        if (vistaPrevia) pintarVistaPrevia(vistaPrevia, lienzo);
        const blob = await aPNG(lienzo);
        if (vez !== this.vez) return null;
        this.hecho = { blob, archivo: new File([blob], nombre, { type: "image/png" }), nombre };
        return blob;
      } catch {
        return null;
      }
    })();
  }

  /** El archivo si ya está generado (sin esperar). */
  get archivo(): File | null {
    return this.hecho?.archivo ?? null;
  }

  get nombre(): string | null {
    return this.hecho?.nombre ?? null;
  }

  /** El PNG, esperando a que se genere; `null` si falló. */
  blob(): Promise<Blob | null> {
    return this.hecho ? Promise.resolve(this.hecho.blob) : this.pendiente;
  }
}

/** Copia la imagen reducida en el `<canvas>` de la vista previa, a su tamaño en pantalla (no es un `<img>`, S17). */
export function pintarVistaPrevia(destino: HTMLCanvasElement, origen: HTMLCanvasElement): void {
  const caja = destino.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  destino.width = Math.max(1, Math.round((caja.width || 80) * ratio));
  destino.height = Math.max(1, Math.round((caja.height || 100) * ratio));
  const ctx = destino.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(origen, 0, 0, destino.width, destino.height);
}
