// Texto de la tarjeta para copiar o compartir, sin emojis (F2, S18): lo
// vistoso es la imagen (F1). El origen llega de fuera (`location.origin` en la
// página), sin dirección fija en el código (D10).
import { crearLibre, crearReto } from "./reto.ts";

/** Altura en metros con una cifra decimal y coma: 3,4 m. */
export function formatearAltura(altura: number): string {
  const valor = Number.isFinite(altura) && altura > 0 ? altura : 0;
  return `${valor.toFixed(1).replace(".", ",")} m`;
}

export function formatearPiezas(piezas: number): string {
  return piezas === 1 ? "1 pieza" : `${piezas} piezas`;
}

/**
 * Entero con punto de miles desde 4 cifras: 999, 1.240, 123.456 (A1). Sin
 * `Intl`, que en español no separa los números de 4 cifras («1240»).
 */
export function formatearNumero(numero: number): string {
  const valor = Number.isFinite(numero) ? Math.trunc(numero) : 0;
  const cifras = String(Math.abs(valor)).replace(/\B(?=(\d{3})+$)/g, ".");
  return valor < 0 ? `-${cifras}` : cifras;
}

/** Puntos de la v2 (B2): «1 punto», «260 puntos», «1.240 puntos». */
export function formatearPuntos(puntos: number): string {
  return puntos === 1 ? "1 punto" : `${formatearNumero(puntos)} puntos`;
}

/** Texto de la tarjeta (F2, S18): sin emojis, una línea con el resultado y otra con el enlace. */
export type DatosTarjeta =
  | {
      modo: "diario";
      dia: number;
      puntos: number;
      altura: number;
      /** Día jugado con la v1: la marca son piezas (C1). */
      enPiezas?: boolean;
      /** Racha de hoy, solo en el oficial de hoy; 0 o sin ella, no se escribe. */
      racha?: number;
      origen: string;
    }
  | {
      modo: "libre";
      /** Código de la partida libre (`?libre=<código>.<puntos>`); sin él, se enlaza la página principal. */
      codigo: string | null;
      puntos: number;
      altura: number;
      origen: string;
    }
  | { modo: "nivel"; nivel: number; estrellas: number; victoria: boolean; origen: string };

function frase(datos: DatosTarjeta): string {
  if (datos.modo === "nivel") {
    if (!datos.victoria) return `Torre Diaria: nivel ${datos.nivel} sin superar todavía.`;
    return `Torre Diaria: nivel ${datos.nivel} con ${datos.estrellas === 1 ? "1 estrella" : `${datos.estrellas} estrellas`}.`;
  }
  if (datos.modo === "libre") return `Torre Diaria: ${formatearPuntos(datos.puntos)} y ${formatearAltura(datos.altura)} en partida libre.`;
  const marca = datos.enPiezas ? formatearPiezas(datos.puntos) : formatearPuntos(datos.puntos);
  const racha = datos.racha ?? 0;
  if (racha > 0) return `Torre Diaria #${datos.dia}: ${marca}, ${formatearAltura(datos.altura)}, racha de ${racha} ${racha === 1 ? "día" : "días"}.`;
  return `Torre Diaria #${datos.dia}: ${marca} y ${formatearAltura(datos.altura)}.`;
}

function enlace(datos: DatosTarjeta): string {
  if (datos.modo === "nivel") return `Juega en ${datos.origen}/`;
  if (datos.modo === "libre") return `¿Me superas? ${datos.origen}/${datos.codigo ? crearLibre(datos.codigo, datos.puntos) : ""}`;
  return `¿Me superas? ${datos.origen}/${crearReto(datos.dia, datos.puntos)}`;
}

export function generarTarjeta(datos: DatosTarjeta): string {
  return `${frase(datos)}\n${enlace(datos)}`;
}
