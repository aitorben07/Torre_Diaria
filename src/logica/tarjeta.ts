// Texto de la tarjeta para copiar o compartir. El origen llega de fuera
// (`location.origin` en la página), sin dirección fija en el código (D10).
import { PALETA } from "./piezas.ts";
import { crearReto } from "./reto.ts";

export const MAX_EMOJIS = 24;

export type DatosTarjeta = {
  modo: "diario" | "libre";
  /** Número de día; se ignora en la partida libre. */
  dia: number;
  puntos: number;
  altura: number;
  /** Color (índice de `PALETA`) de cada pieza de la torre, de abajo arriba. */
  formas: Array<{ color: number }>;
  origen: string;
};

/** Altura en metros con una cifra decimal y coma: 3,4 m. */
export function formatearAltura(altura: number): string {
  const valor = Number.isFinite(altura) && altura > 0 ? altura : 0;
  return `${valor.toFixed(1).replace(".", ",")} m`;
}

export function formatearPiezas(piezas: number): string {
  return piezas === 1 ? "1 pieza" : `${piezas} piezas`;
}

/** Puntos de la v2 (B2): «1 punto», «260 puntos». El punto de miles llega con A1. */
export function formatearPuntos(puntos: number): string {
  return puntos === 1 ? "1 punto" : `${puntos} puntos`;
}

function filaEmojis(formas: Array<{ color: number }>): string {
  const emojis = formas.slice(0, MAX_EMOJIS).map(({ color }) => PALETA[color]?.emoji ?? "⬜");
  const resto = formas.length - MAX_EMOJIS;
  return emojis.join("") + (resto > 0 ? ` +${resto}` : "");
}

export function generarTarjeta(datos: DatosTarjeta): string {
  const lineas: string[] = [];
  if (datos.modo === "diario") {
    lineas.push(`Torre Diaria #${datos.dia} 🏗️`);
  } else {
    lineas.push("Torre Diaria · Partida libre 🏗️");
  }
  if (datos.formas.length > 0) lineas.push(filaEmojis(datos.formas));
  lineas.push(`${formatearPuntos(datos.puntos)} · ${formatearAltura(datos.altura)}`);
  if (datos.modo === "diario") {
    lineas.push(`¿Me superas? ${datos.origen}/${crearReto(datos.dia, datos.puntos)}`);
  } else {
    lineas.push(`¿Me superas? ${datos.origen}/`);
  }
  return lineas.join("\n");
}
