// Imagen para compartir (F1, Anexo 1, 7.1): un PNG de 1080×1350 dibujado en un
// `<canvas>` aparte con el tema y el escenario equipados. Cabecera «TORRE
// DIARIA», etiqueta del modo, la torre con las formas, medidas y colores
// reales (hasta 40; luego «+N»), los puntos, una fila de datos y abajo «¿Me
// superas?» con el dominio. Sin emojis ni texto de la URL: solo datos propios y
// `location.host` (G5). Estrellas como trazados, nunca como caracteres (G11).
import type { Pieza } from "../logica/piezas.ts";
import { fechaDeDia } from "../logica/semilla.ts";
import { formatearAltura, formatearNumero } from "../logica/tarjeta.ts";
import { rutaPieza } from "./dibujo.ts";
import { RUTA_ESTRELLA } from "./mapa.ts";
import { colorCielo, COLORES, FAMILIA, oscurecer, type Escenario, type Tema } from "./temas.ts";

export const ANCHO_IMAGEN = 1080;
export const ALTO_IMAGEN = 1350;
/** Piezas que se dibujan como mucho; las demás se cuentan en «+N». */
export const MAX_PIEZAS_IMAGEN = 40;

const MESES_CORTOS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export type DatosImagen = {
  modo: "libre" | "diario" | "nivel";
  /** Día del reto diario. */
  dia?: number;
  /** Nivel y estrellas de esta partida. */
  nivel?: number;
  estrellas?: number;
  puntos: number;
  /** Día jugado con la v1: la marca son piezas. */
  enPiezas?: boolean;
  altura: number;
  perfectos?: number | null;
  comboMax?: number | null;
  /** Racha del reto de hoy (0 o sin ella, no se escribe). */
  racha?: number;
  /** Piezas colocadas, de abajo arriba. */
  formas: ReadonlyArray<Pick<Pieza, "forma" | "ancho" | "alto" | "color">>;
  tema: Tema;
  escenario: Escenario;
  /** Dominio de la página (`location.host`). */
  host: string;
};

/** «RETO #16 · 20 NOV», «PARTIDA LIBRE» o «NIVEL 3» (las estrellas van dibujadas al lado). */
export function etiquetaModo(datos: Pick<DatosImagen, "modo" | "dia" | "nivel">): string {
  if (datos.modo === "libre") return "PARTIDA LIBRE";
  if (datos.modo === "nivel") return `NIVEL ${datos.nivel ?? 0}`;
  const fecha = fechaDeDia(datos.dia ?? 1);
  return `RETO #${datos.dia ?? 1} · ${Number(fecha.slice(8, 10))} ${MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}`;
}

/** Fila de datos: altura, perfectos, mejor combo y racha, los que haya. */
export function filaDatos(datos: Pick<DatosImagen, "altura" | "perfectos" | "comboMax" | "racha">): string {
  const partes = [formatearAltura(datos.altura)];
  if (datos.perfectos !== null && datos.perfectos !== undefined) partes.push(datos.perfectos === 1 ? "1 perfecto" : `${formatearNumero(datos.perfectos)} perfectos`);
  if (datos.comboMax) partes.push(`combo ×${datos.comboMax}`);
  if (datos.racha && datos.racha > 0) partes.push(`racha de ${datos.racha}`);
  return partes.join(" · ");
}

const fuente = (peso: number, px: number) => `${peso} ${px}px ${FAMILIA}`;

/** Texto con la copia rosa desplazada (tinta fuera de registro, como el HUD). */
function textoImpreso(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, desfase: number): void {
  ctx.fillStyle = COLORES.rosa;
  ctx.fillText(texto, x + desfase, y + desfase);
  ctx.fillStyle = COLORES.tinta;
  ctx.fillText(texto, x, y);
}

/** Reduce la letra hasta que `texto` quepa en `ancho` píxeles. */
function ajustarLetra(ctx: CanvasRenderingContext2D, texto: string, peso: number, px: number, ancho: number): number {
  let tam = px;
  ctx.font = fuente(peso, tam);
  while (tam > 16 && ctx.measureText(texto).width > ancho) {
    tam -= 2;
    ctx.font = fuente(peso, tam);
  }
  return tam;
}

function estrella(ctx: CanvasRenderingContext2D, x: number, y: number, lado: number, llena: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lado / 24, lado / 24);
  const ruta = new Path2D(RUTA_ESTRELLA);
  ctx.fillStyle = llena ? COLORES.amarillo : COLORES.papelOscuro;
  ctx.fill(ruta);
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = COLORES.tinta;
  ctx.stroke(ruta);
  ctx.restore();
}

/** Rectángulo de papel con borde de tinta y sombra desplazada, como los paneles de la interfaz. */
function pegatina(ctx: CanvasRenderingContext2D, x: number, y: number, ancho: number, alto: number, relleno: string): void {
  ctx.fillStyle = COLORES.tinta;
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 8, ancho, alto, 18);
  ctx.fill();
  ctx.fillStyle = relleno;
  ctx.beginPath();
  ctx.roundRect(x, y, ancho, alto, 18);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = COLORES.tinta;
  ctx.stroke();
}

/** Fondo: papel con grano, el cielo del escenario en suave, el sol de dos tintas y el mar. */
function dibujarFondo(ctx: CanvasRenderingContext2D, escenario: Escenario): void {
  ctx.fillStyle = COLORES.papel;
  ctx.fillRect(0, 0, ANCHO_IMAGEN, ALTO_IMAGEN);
  const cielo = ctx.createLinearGradient(0, 300, 0, 980);
  cielo.addColorStop(0, COLORES.papel);
  cielo.addColorStop(0.45, colorCielo(escenario, 10));
  cielo.addColorStop(1, colorCielo(escenario, 24));
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 300, ANCHO_IMAGEN, 700);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = escenario.sol[1];
  ctx.beginPath();
  ctx.arc(232, 812, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = escenario.sol[0];
  ctx.beginPath();
  ctx.arc(220, 822, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Grano de papel: un punto cada 8 píxeles, desplazado en filas alternas.
  ctx.fillStyle = COLORES.papelOscuro;
  ctx.globalAlpha = 0.55;
  for (let y = 4; y < ALTO_IMAGEN; y += 8) {
    for (let x = (y / 8) % 2 === 0 ? 3 : 7; x < ANCHO_IMAGEN; x += 8) ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Mar del escenario bajo el muelle.
  ctx.fillStyle = escenario.agua;
  ctx.fillRect(0, 960, ANCHO_IMAGEN, 262);
  ctx.strokeStyle = escenario.espuma;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const [x, y] of [
    [90, 1000],
    [330, 1060],
    [720, 1010],
    [930, 1080],
    [520, 1130],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 30, y - 14, x + 60, y);
    ctx.stroke();
  }
}

/** Torre apilada (Anexo 1, 7.1): cada pieza centrada sobre la anterior, con sombra, contorno y ojos. */
function dibujarTorre(ctx: CanvasRenderingContext2D, datos: DatosImagen): void {
  const { tema, escenario } = datos;
  const cimaZona = 330;
  const sueloY = 930;
  const visibles = datos.formas.slice(0, MAX_PIEZAS_IMAGEN);
  const resto = datos.formas.length - visibles.length;
  const alto = visibles.reduce((suma, p) => suma + p.alto, 0);
  const ancho = visibles.reduce((maximo, p) => Math.max(maximo, p.ancho), 0);
  const k = Math.min(150, (sueloY - cimaZona - (resto > 0 ? 90 : 20)) / Math.max(alto, 0.01), 560 / Math.max(ancho, 0.01));
  // Muelle del escenario.
  ctx.fillStyle = escenario.frente;
  ctx.strokeStyle = COLORES.tinta;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(290, sueloY, 500, 44, 8);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 10;
  for (const x of [330, 450, 630, 750]) {
    ctx.beginPath();
    ctx.moveTo(x, sueloY + 44);
    ctx.lineTo(x, sueloY + 120);
    ctx.stroke();
  }
  let base = sueloY;
  for (const pieza of visibles) {
    const cy = base - (pieza.alto * k) / 2;
    const ruta = rutaPieza(pieza);
    const color = tema.piezas[pieza.color] ?? tema.piezas[0]!;
    ctx.save();
    ctx.translate(ANCHO_IMAGEN / 2, cy);
    ctx.scale(k, -k);
    ctx.save();
    ctx.translate(0.06, -0.06);
    ctx.fillStyle = oscurecer(color, 0.35);
    ctx.fill(ruta);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.fill(ruta);
    ctx.lineWidth = Math.max(0.035, 4 / k);
    ctx.lineJoin = "round";
    ctx.strokeStyle = tema.contorno;
    ctx.stroke(ruta);
    if (tema.ojos && (pieza.forma === "bloque" || pieza.forma === "cuadrado")) {
      const separacion = Math.min(0.22, pieza.ancho * 0.22);
      const yOjo = Math.min(pieza.alto * 0.14, 0.12);
      for (const lado of [-1, 1]) {
        ctx.fillStyle = tema.contorno;
        ctx.beginPath();
        ctx.arc(lado * separacion, yOjo, 0.075, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORES.papel;
        ctx.beginPath();
        ctx.arc(lado * separacion + 0.026, yOjo + 0.026, 0.024, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    base -= pieza.alto * k;
  }
  if (resto > 0) {
    const texto = `+${formatearNumero(resto)}`;
    ctx.font = fuente(800, 64);
    const w = ctx.measureText(texto).width + 48;
    pegatina(ctx, ANCHO_IMAGEN / 2 - w / 2, base - 100, w, 84, COLORES.amarillo);
    ctx.fillStyle = COLORES.tinta;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, ANCHO_IMAGEN / 2, base - 56);
  }
}

/** Dibuja la imagen entera en `ctx` (de `ANCHO_IMAGEN` × `ALTO_IMAGEN`). */
export function dibujarImagen(ctx: CanvasRenderingContext2D, datos: DatosImagen): void {
  ctx.save();
  dibujarFondo(ctx, datos.escenario);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // Cabecera.
  ctx.font = fuente(800, 116);
  textoImpreso(ctx, "TORRE DIARIA", ANCHO_IMAGEN / 2, 170, 7);
  // Etiqueta del modo, con las estrellas dibujadas en el nivel.
  const etiqueta = etiquetaModo(datos);
  ctx.font = fuente(800, 46);
  const conEstrellas = datos.modo === "nivel";
  const anchoTexto = ctx.measureText(etiqueta).width;
  const anchoEtiqueta = anchoTexto + 64 + (conEstrellas ? 3 * 50 + 16 : 0);
  const xEtiqueta = ANCHO_IMAGEN / 2 - anchoEtiqueta / 2;
  pegatina(ctx, xEtiqueta, 210, anchoEtiqueta, 78, COLORES.amarillo);
  ctx.fillStyle = COLORES.tinta;
  ctx.textAlign = "left";
  ctx.fillText(etiqueta, xEtiqueta + 32, 265);
  if (conEstrellas) {
    for (let i = 0; i < 3; i++) estrella(ctx, xEtiqueta + 32 + anchoTexto + 16 + i * 50, 225, 48, i < (datos.estrellas ?? 0));
  }
  dibujarTorre(ctx, datos);
  // Puntos (o piezas en un día de la v1) en grande.
  ctx.textAlign = "center";
  const numero = formatearNumero(datos.puntos);
  const unidad = datos.enPiezas ? (datos.puntos === 1 ? "pieza" : "piezas") : datos.puntos === 1 ? "punto" : "puntos";
  pegatina(ctx, 120, 1000, ANCHO_IMAGEN - 240, 190, COLORES.papel);
  const tam = ajustarLetra(ctx, `${numero} ${unidad}`, 800, 120, ANCHO_IMAGEN - 320);
  ctx.font = fuente(800, tam);
  const anchoNumero = ctx.measureText(numero).width;
  ctx.font = fuente(700, Math.round(tam * 0.42));
  const anchoUnidad = ctx.measureText(` ${unidad}`).width;
  const x0 = ANCHO_IMAGEN / 2 - (anchoNumero + anchoUnidad) / 2;
  ctx.textAlign = "left";
  ctx.font = fuente(800, tam);
  textoImpreso(ctx, numero, x0, 1100, 6);
  ctx.font = fuente(700, Math.round(tam * 0.42));
  ctx.fillStyle = COLORES.tinta;
  ctx.fillText(` ${unidad}`, x0 + anchoNumero, 1100);
  // Fila de datos.
  ctx.textAlign = "center";
  const fila = filaDatos(datos);
  ajustarLetra(ctx, fila, 700, 44, ANCHO_IMAGEN - 320);
  ctx.fillText(fila, ANCHO_IMAGEN / 2, 1160);
  // Pie de tinta con la llamada a jugar y el dominio.
  ctx.fillStyle = COLORES.tinta;
  ctx.fillRect(0, 1222, ANCHO_IMAGEN, ALTO_IMAGEN - 1222);
  ctx.font = fuente(800, 60);
  ctx.fillStyle = COLORES.papel;
  ctx.fillText("¿Me superas?", ANCHO_IMAGEN / 2, 1282);
  ajustarLetra(ctx, datos.host, 700, 40, ANCHO_IMAGEN - 160);
  ctx.fillStyle = COLORES.amarillo;
  ctx.fillText(datos.host, ANCHO_IMAGEN / 2, 1330);
  ctx.restore();
}

/**
 * Espera a las caras de la fuente que usa la imagen (impacto: `fonts.ready` no
 * fuerza la descarga de una cara que el DOM aún no ha pedido). Si falla, se
 * dibuja con la fuente de respaldo.
 */
async function cargarFuente(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(fuente(800, 64)), document.fonts.load(fuente(700, 44))]);
  } catch {
    // Sin la API de fuentes, con la de respaldo.
  }
}

/** Lienzo de 1080×1350 con la imagen ya dibujada (para la vista previa y el PNG). */
export async function lienzoDeImagen(datos: DatosImagen): Promise<HTMLCanvasElement> {
  await cargarFuente();
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO_IMAGEN;
  lienzo.height = ALTO_IMAGEN;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Sin contexto 2D");
  dibujarImagen(ctx, datos);
  return lienzo;
}

/** PNG de un lienzo con `toBlob` (sin `blob:` en `img-src`: no se muestra como `<img>`). */
export function aPNG(lienzo: HTMLCanvasElement): Promise<Blob> {
  return new Promise((listo, falla) => lienzo.toBlob((blob) => (blob ? listo(blob) : falla(new Error("toBlob sin datos"))), "image/png"));
}

/** La imagen como PNG de 1080×1350. */
export async function generarPNG(datos: DatosImagen): Promise<Blob> {
  return aPNG(await lienzoDeImagen(datos));
}
