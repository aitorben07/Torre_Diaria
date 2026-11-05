// Pantallas de inicio y fin, copiar y compartir. Todo texto que viene del
// enlace o del almacenamiento se escribe con `textContent`, nunca como HTML.
import { formatearAltura, formatearPiezas } from "../logica/tarjeta.ts";
import type { Reto } from "../logica/reto.ts";

export type Estado = "inicio" | "jugando" | "fin";

function elemento<T extends HTMLElement = HTMLElement>(id: string): T {
  const encontrado = document.getElementById(id);
  if (!encontrado) throw new Error(`Falta #${id} en la página`);
  return encontrado as T;
}

export const ui = {
  juego: () => elemento("juego"),
  zona: () => elemento("zona"),
  lienzo: () => elemento<HTMLCanvasElement>("lienzo"),
  contador: () => elemento("contador"),
  inicio: () => elemento("inicio"),
  avisoReto: () => elemento("aviso-reto"),
  comparacion: () => elemento("comparacion"),
  botonHoy: () => elemento<HTMLButtonElement>("boton-hoy"),
  botonReto: () => elemento<HTMLButtonElement>("boton-reto"),
  botonPracticaInicio: () => elemento<HTMLButtonElement>("boton-practica-inicio"),
  fin: () => elemento("fin"),
  finTitulo: () => elemento("fin-titulo"),
  finPuntos: () => elemento("fin-puntos"),
  finAltura: () => elemento("fin-altura"),
  finReto: () => elemento("fin-reto"),
  tarjeta: () => elemento("tarjeta"),
  botonCopiar: () => elemento<HTMLButtonElement>("boton-copiar"),
  botonCompartir: () => elemento<HTMLButtonElement>("boton-compartir"),
  mensaje: () => elemento("mensaje"),
  botonPracticaFin: () => elemento<HTMLButtonElement>("boton-practica-fin"),
  botonVolver: () => elemento<HTMLButtonElement>("boton-volver"),
};

export function cambiarEstado(estado: Estado): void {
  ui.juego().dataset.estado = estado;
  ui.inicio().hidden = estado !== "inicio";
  ui.fin().hidden = estado !== "fin";
}

function mostrarTexto(nodo: HTMLElement, texto: string | null): void {
  nodo.textContent = texto ?? "";
  nodo.hidden = texto === null;
}

export type DatosInicio = {
  hoy: number;
  puntosHoy: number | null;
  reto: Reto | null;
};

export function pintarInicio({ hoy, puntosHoy, reto }: DatosInicio): void {
  ui.botonHoy().textContent = puntosHoy === null ? `Jugar el reto de hoy #${hoy}` : "Ver mi resultado de hoy";
  mostrarTexto(
    ui.avisoReto(),
    reto ? `Tu amigo hizo ${formatearPiezas(reto.puntos)} en el día #${reto.dia}. ¿Le superas?` : null,
  );
  mostrarTexto(
    ui.comparacion(),
    reto && reto.dia === hoy && puntosHoy !== null ? `Tú: ${puntosHoy} · Tu amigo: ${reto.puntos}` : null,
  );
  const otroDia = reto !== null && reto.dia < hoy;
  ui.botonReto().hidden = !otroDia;
  if (otroDia) ui.botonReto().textContent = `Jugar el reto del día #${reto.dia}`;
}

export type DatosFin = {
  titulo: string;
  puntos: number;
  altura: number;
  tarjeta: string;
  /** Puntos del amigo si esta partida responde a su reto. */
  puntosAmigo: number | null;
};

export function textoComparacion(puntos: number, amigo: number): string {
  if (puntos > amigo) return `¡Has batido la marca de tu amigo (${formatearPiezas(amigo)})!`;
  if (puntos === amigo) return `Empate con tu amigo: ${formatearPiezas(amigo)}.`;
  return `Tu amigo sigue por delante: ${formatearPiezas(amigo)}.`;
}

export function pintarFin(datos: DatosFin): void {
  ui.finTitulo().textContent = datos.titulo;
  ui.finPuntos().textContent = formatearPiezas(datos.puntos);
  ui.finAltura().textContent = formatearAltura(datos.altura);
  mostrarTexto(ui.finReto(), datos.puntosAmigo === null ? null : textoComparacion(datos.puntos, datos.puntosAmigo));
  ui.tarjeta().textContent = datos.tarjeta;
  ui.mensaje().textContent = "";
  ui.botonCompartir().hidden = typeof navigator.share !== "function";
}

/** Copia con el portapapeles y, si no está, con un `textarea` seleccionado. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Sigue con la alternativa.
  }
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.className = "fuera-de-vista";
  document.body.append(area);
  area.select();
  let copiado = false;
  try {
    copiado = document.execCommand("copy");
  } catch {
    copiado = false;
  }
  area.remove();
  return copiado;
}

/**
 * Comparte solo con `text`, que ya lleva el enlace: con `text` y `url` a la vez
 * algunas apps se quedan con uno de los dos. Cancelar no es un error.
 */
export async function compartir(texto: string): Promise<"compartido" | "cancelado" | "error"> {
  try {
    await navigator.share({ text: texto });
    return "compartido";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "cancelado" : "error";
  }
}
