// Monedas, récords y estadísticas (C2, Anexo 1, 4.2). Funciones puras: la
// página las aplica al progreso con `Guardado.cambiar`. La simulación no sabe
// nada de esto: solo da el resultado de la partida.
import { MONEDAS_COLOCADA, MONEDAS_HITO, MONEDAS_PERFECTO, METROS_HITO } from "./puntuacion.ts";
import type { Progreso } from "./progreso.ts";

export type Medalla = "bronce" | "plata" | "oro";

/** Monedas del reto diario oficial según su medalla, antes del extra por racha. */
export const PREMIO_DIARIO: Record<Medalla | "ninguna", number> = { ninguna: 15, bronce: 30, plata: 60, oro: 100 };
/** Extra del reto diario por cada día de racha, hasta `RACHA_PREMIO_MAX`. */
export const PREMIO_RACHA = 10;
export const RACHA_PREMIO_MAX = 7;
export const PREMIO_ESTRELLA = 20;
export const PREMIO_MUNDO = 200;

/** Hitos de altura cobrados con una altura máxima de `alturaMax` metros. */
export function hitosDeAltura(alturaMax: number): number {
  return Math.max(0, Math.floor(alturaMax / METROS_HITO));
}

/** Monedas de una partida: 1 por pieza colocada, +1 por perfecto, +5 por hito. */
export function monedasDePartida({ piezas, perfectos, hitos }: { piezas: number; perfectos: number; hitos: number }): number {
  return piezas * MONEDAS_COLOCADA + perfectos * MONEDAS_PERFECTO + hitos * MONEDAS_HITO;
}

/** Premio del reto diario oficial: por medalla y 10 por día de racha (como mucho 7). */
export function premioDiario(medalla: Medalla | null, racha: number): number {
  return PREMIO_DIARIO[medalla ?? "ninguna"] + PREMIO_RACHA * Math.min(Math.max(0, racha), RACHA_PREMIO_MAX);
}

/** Premio de un nivel: 20 por estrella nueva y 200 al completar el mundo con 3 estrellas en todo. */
export function premioNivel(estrellasNuevas: number, mundoCompletado: boolean): number {
  return PREMIO_ESTRELLA * Math.max(0, estrellasNuevas) + (mundoCompletado ? PREMIO_MUNDO : 0);
}

/** Lo que cuenta de una partida acabada para monedas, récord y estadísticas. */
export type PartidaAcabada = {
  /**
   * Identifica la partida jugada (semilla y número de partida, de `empezar`):
   * la misma semilla se puede jugar otra vez, pero cada partida se cobra una sola vez.
   */
  id: string;
  puntos: number;
  piezas: number;
  perfectos: number;
  comboMax: number;
  alturaMax: number;
};

/** Suma las estadísticas de una partida (cualquier modo). */
export function sumarEstadisticas(p: Progreso, partida: PartidaAcabada): Progreso {
  const e = p.estadisticas;
  return {
    ...p,
    estadisticas: {
      piezas: e.piezas + partida.piezas,
      perfectos: e.perfectos + partida.perfectos,
      comboMax: Math.max(e.comboMax, partida.comboMax),
      alturaMax: Math.max(e.alturaMax, partida.alturaMax),
    },
  };
}

/** Partida libre cobrada: el progreso y lo que se ha guardado de verdad. */
export type LibreCobrada = {
  progreso: Progreso;
  /** Monedas sumadas; 0 si la partida ya se había cobrado. */
  monedas: number;
  /** ¿Ha subido el récord de puntos? */
  nuevoRecord: boolean;
  /** `false` si la partida ya se había cobrado (otra pestaña, o la misma dos veces). */
  nuevo: boolean;
};

/**
 * Partida libre acabada: monedas, récord de puntos y de altura, partidas
 * jugadas y estadísticas. Si `id` ya se cobró, no cambia nada.
 */
export function cobrarLibre(p: Progreso, partida: PartidaAcabada): LibreCobrada {
  if (p.ultimaCobrada === partida.id) return { progreso: p, monedas: 0, nuevoRecord: false, nuevo: false };
  const monedas = monedasDePartida({ ...partida, hitos: hitosDeAltura(partida.alturaMax) });
  const progreso = sumarEstadisticas(
    {
      ...p,
      monedas: p.monedas + monedas,
      libre: {
        record: Math.max(p.libre.record, partida.puntos),
        alturaRecord: Math.max(p.libre.alturaRecord, partida.alturaMax),
        partidas: p.libre.partidas + 1,
      },
      ultimaCobrada: partida.id,
    },
    partida,
  );
  return { progreso, monedas, nuevoRecord: partida.puntos > p.libre.record, nuevo: true };
}
