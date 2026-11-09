// Piezas especiales (H1 de la tercera versión, Anexo G con los cambios de
// impacto): dorada, pegajosa y cemento. Salen de la semilla con un generador
// aparte, uno por tramo (`<semilla>|especiales|<tramo>`), así que son iguales
// para todos, no cambian la secuencia de formas y dan lo mismo se pidan en el
// orden que se pidan. Puro y determinista: sin reloj ni azar propio.
import { crearGenerador } from "./semilla.ts";

export const ESPECIALES = ["dorada", "pegajosa", "cemento"] as const;
export type Especial = (typeof ESPECIALES)[number];

/** Ninguna especial antes de esta pieza (índice desde 0). */
export const PRIMERA_ESPECIAL = 8;
/** Exactamente una especial en cada tramo de tantas piezas desde `PRIMERA_ESPECIAL`. */
export const TRAMO_ESPECIAL = 8;
/** Pieza desde la que puede salir cada tipo: la dorada en el primer tramo, la pegajosa en el segundo y el cemento en el tercero. */
export const DESDE_ESPECIAL: Record<Especial, number> = { dorada: 8, pegajosa: 16, cemento: 24 };
/** Pesos de cada tipo entre los posibles de su tramo (Anexo G, propuesta a medir en L1). */
export const PESO_ESPECIAL: Record<Especial, number> = { dorada: 0.4, pegajosa: 0.3, cemento: 0.3 };
/** Monedas de más de una dorada colocada (H2). */
export const MONEDAS_DORADA = 10;

export type OpcionesEspeciales = {
  /** Con `false` no sale ninguna (niveles 1 a 3). Por defecto, `true`. */
  especiales?: boolean;
};

/** Tramo de la pieza `indice` (0 el de la pieza 8 a la 15), o -1 si va antes de la primera especial. */
export function tramoDe(indice: number): number {
  return indice < PRIMERA_ESPECIAL ? -1 : Math.floor((indice - PRIMERA_ESPECIAL) / TRAMO_ESPECIAL);
}

/** Especial del tramo: su posición dentro del tramo y su tipo, del generador de ese tramo. */
export function especialDelTramo(semilla: string, tramo: number): { posicion: number; especial: Especial } {
  const azar = crearGenerador(`${semilla}|especiales|${tramo}`);
  const posicion = Math.floor(azar() * TRAMO_ESPECIAL);
  const inicio = PRIMERA_ESPECIAL + tramo * TRAMO_ESPECIAL;
  const posibles = ESPECIALES.filter((e) => DESDE_ESPECIAL[e] <= inicio);
  const total = posibles.reduce((suma, e) => suma + PESO_ESPECIAL[e], 0);
  let valor = azar() * total;
  let especial: Especial = posibles[posibles.length - 1]!;
  for (const e of posibles) {
    if (valor < PESO_ESPECIAL[e]) {
      especial = e;
      break;
    }
    valor -= PESO_ESPECIAL[e];
  }
  return { posicion, especial };
}

/** ¿Qué especial es la pieza `indice` de `semilla`? `null` si es normal. */
export function especialDe(semilla: string, indice: number, { especiales = true }: OpcionesEspeciales = {}): Especial | null {
  const tramo = tramoDe(indice);
  if (!especiales || tramo < 0) return null;
  const { posicion, especial } = especialDelTramo(semilla, tramo);
  return indice - PRIMERA_ESPECIAL - tramo * TRAMO_ESPECIAL === posicion ? especial : null;
}
