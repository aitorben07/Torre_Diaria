// HUD, aviso del reto de un amigo, pantalla de fin, copiar y compartir. Todo
// texto que viene del enlace o del almacenamiento se escribe con
// `textContent`, nunca como HTML.
import { formatearAltura, formatearNumero, formatearPuntos } from "../logica/tarjeta.ts";
import type { Reto } from "../logica/reto.ts";
import type { Pantalla } from "./flujo.ts";

function elemento<T extends HTMLElement = HTMLElement>(id: string): T {
  const encontrado = document.getElementById(id);
  if (!encontrado) throw new Error(`Falta #${id} en la página`);
  return encontrado as T;
}

export const ui = {
  juego: () => elemento("juego"),
  zona: () => elemento("zona"),
  lienzo: () => elemento<HTMLCanvasElement>("lienzo"),
  grano: () => elemento("grano"),
  contador: () => elemento("contador"),
  hud: () => elemento("hud"),
  hudPuntos: () => elemento("hud-puntos"),
  vidas: () => elemento("vidas"),
  combo: () => elemento("combo"),
  record: () => elemento("record"),
  botonHoy: () => elemento<HTMLButtonElement>("boton-hoy"),
  avisoToque: () => elemento("aviso-toque"),
  botonSonido: () => elemento<HTMLButtonElement>("boton-sonido"),
  botonVibracion: () => elemento<HTMLButtonElement>("boton-vibracion"),
  reto: () => elemento("reto"),
  avisoReto: () => elemento("aviso-reto"),
  comparacion: () => elemento("comparacion"),
  botonReto: () => elemento<HTMLButtonElement>("boton-reto"),
  botonLibreReto: () => elemento<HTMLButtonElement>("boton-libre-reto"),
  fin: () => elemento("fin"),
  finTitulo: () => elemento("fin-titulo"),
  finPuntos: () => elemento("fin-puntos"),
  finNumero: () => elemento("fin-numero"),
  finUnidad: () => elemento("fin-unidad"),
  finAltura: () => elemento("fin-altura"),
  finRecord: () => elemento("fin-record"),
  finReto: () => elemento("fin-reto"),
  tarjeta: () => elemento("tarjeta"),
  botonCopiar: () => elemento<HTMLButtonElement>("boton-copiar"),
  botonCompartir: () => elemento<HTMLButtonElement>("boton-compartir"),
  mensaje: () => elemento("mensaje"),
  botonOtraVez: () => elemento<HTMLButtonElement>("boton-otra-vez"),
};

export function cambiarEstado(estado: Pantalla): void {
  ui.juego().dataset.estado = estado;
  ui.reto().hidden = estado !== "reto";
  ui.fin().hidden = estado !== "fin";
}

function mostrarTexto(nodo: HTMLElement, texto: string | null): void {
  nodo.textContent = texto ?? "";
  nodo.hidden = texto === null;
}

/** Vuelve a lanzar una animación CSS de `clase` en `nodo`, aunque ya la tuviera. */
function reanimar(nodo: Element, clase: string): void {
  nodo.classList.remove("rompe", "vuelve", "late");
  void (nodo as HTMLElement).offsetWidth;
  nodo.classList.add(clase);
}

export type DatosHud = {
  puntos: number;
  vidas: number;
  /** Vidas que caben en el HUD (iconos). */
  vidasMax: number;
  combo: number;
  /** Récord de la partida libre, o `null` fuera de ella. */
  record: number | null;
};

/** HUD de la partida: puntos, vidas como iconos (no caracteres, G11), combo si es 2 o más y récord. */
export function pintarHud({ puntos, vidas, vidasMax, combo, record }: DatosHud): void {
  ui.contador().textContent = formatearPuntos(puntos);
  ui.hudPuntos().textContent = formatearNumero(puntos);
  const iconos = ui.vidas();
  iconos.setAttribute("aria-label", vidas === 1 ? "1 vida" : `${vidas} vidas`);
  ui.juego().dataset.vidas = String(vidas);
  const lista = [...iconos.children];
  for (const [i, icono] of lista.entries()) {
    const perdida = i >= vidas;
    // La vida que se pierde se rompe y la que vuelve salta (A3).
    if (perdida !== icono.classList.contains("perdida")) reanimar(icono, perdida ? "rompe" : "vuelve");
    icono.classList.toggle("perdida", perdida);
  }
  for (let i = lista.length; i < vidasMax; i++) {
    const icono = document.createElement("span");
    icono.className = i >= vidas ? "vida perdida" : "vida";
    iconos.append(icono);
  }
  const comboAntes = ui.combo().hidden ? 0 : Number(ui.combo().dataset.combo ?? 0);
  mostrarTexto(ui.combo(), combo >= 2 ? `Combo ×${combo}` : null);
  ui.combo().dataset.combo = String(combo);
  if (combo >= 2 && combo > comboAntes) reanimar(ui.combo(), "late");
  // Con récord 0 (la primera partida) no hay nada que batir: no se muestra.
  mostrarTexto(ui.record(), record === null || record <= 0 ? null : `Récord ${formatearNumero(record)}`);
}

export type DatosReto = {
  hoy: number;
  reto: Reto;
  /** Puntos de la oficial de hoy, si ya se jugó. */
  puntosHoy: number | null;
};

/** Aviso del enlace de un amigo: su marca y el botón para jugar ese día. */
export function pintarReto({ hoy, reto, puntosHoy }: DatosReto): void {
  ui.avisoReto().textContent = `Tu amigo hizo ${formatearPuntos(reto.puntos)} en el día #${reto.dia}. ¿Le superas?`;
  const jugado = reto.dia === hoy && puntosHoy !== null;
  mostrarTexto(ui.comparacion(), jugado ? `Tú: ${puntosHoy} · Tu amigo: ${reto.puntos}` : null);
  ui.botonReto().textContent = jugado
    ? "Ver mi resultado de hoy"
    : reto.dia === hoy
      ? `Jugar el reto de hoy #${hoy}`
      : `Jugar el reto del día #${reto.dia}`;
}

export type DatosFin = {
  titulo: string;
  puntos: number;
  altura: number;
  tarjeta: string;
  /** Récord de la partida libre (ya actualizado), o `null` en el reto diario. */
  record: number | null;
  /** Puntos del amigo si esta partida responde a su reto. */
  puntosAmigo: number | null;
  /** Texto del botón principal: «Otra vez» en la libre, «Partida libre» en el reto. */
  principal: string;
};

export function textoComparacion(puntos: number, amigo: number): string {
  if (puntos > amigo) return `¡Has batido la marca de tu amigo (${formatearPuntos(amigo)})!`;
  if (puntos === amigo) return `Empate con tu amigo: ${formatearPuntos(amigo)}.`;
  return `Tu amigo sigue por delante: ${formatearPuntos(amigo)}.`;
}

export function pintarFin(datos: DatosFin): void {
  ui.finTitulo().textContent = datos.titulo;
  ui.finPuntos().textContent = formatearPuntos(datos.puntos);
  ui.finUnidad().textContent = datos.puntos === 1 ? "punto" : "puntos";
  contar(ui.finNumero(), datos.puntos);
  ui.finAltura().textContent = formatearAltura(datos.altura);
  mostrarTexto(ui.finRecord(), datos.record === null ? null : `Récord ${formatearNumero(datos.record)}`);
  mostrarTexto(ui.finReto(), datos.puntosAmigo === null ? null : textoComparacion(datos.puntos, datos.puntosAmigo));
  ui.tarjeta().textContent = datos.tarjeta;
  ui.mensaje().textContent = "";
  ui.botonCompartir().hidden = typeof navigator.share !== "function";
  ui.botonOtraVez().textContent = datos.principal;
}

/** Duración del recuento de puntos en el fin (Anexo 1, 1.5). */
export const RECUENTO_MS = 800;
let recuento = 0;

/**
 * Recuento de 0 a `puntos` en `RECUENTO_MS`, solo visual (el número exacto
 * está en `#fin-puntos` para lectores y pruebas). Con movimiento reducido, directo.
 */
function contar(nodo: HTMLElement, puntos: number): void {
  const vez = ++recuento;
  const directo = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || puntos <= 0;
  if (directo) {
    nodo.textContent = formatearNumero(puntos);
    return;
  }
  const desde = performance.now();
  const paso = (ahora: number) => {
    if (vez !== recuento) return;
    const t = Math.min(1, (ahora - desde) / RECUENTO_MS);
    nodo.textContent = formatearNumero(Math.round(puntos * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(paso);
  };
  nodo.textContent = "0";
  requestAnimationFrame(paso);
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
