// Retos diarios, medallas y rachas (D1). Lógica pura sobre el progreso de C1:
// todos los días desde el 1 hasta hoy se pueden jugar; el primer intento de
// cada día es el oficial y se guarda; si se juega en su día UTC cuenta para la
// racha y si no, es «atrasado» (medalla y monedas, sin racha). Las
// repeticiones no se guardan ni dan monedas.
import { hitosDeAltura, monedasDePartida, premioDiario, sumarEstadisticas, type Medalla, type PartidaAcabada } from "./economia.ts";
import { aTramos, type DiaJugado, type Progreso } from "./progreso.ts";
import { DIA_1, fechaDeDia, numeroDia } from "./semilla.ts";
import { REGLAS } from "./simulacion.ts";

export type Umbrales = { bronce: number; plata: number; oro: number };

/**
 * Puntos mínimos de cada medalla por versión de las reglas (R16): un día
 * guardado conserva la medalla con los umbrales de las reglas con que se jugó.
 *
 * - Reglas 2 (S26), con las medianas de B4 (días 1 a 30, medidas el
 *   2026-11-08): bronce = mediana del novato (567,5), plata = mediana del medio
 *   (2.430) y oro = percentil 25 del experto (≈ 4.039), redondeados a 50 hacia
 *   abajo para que cada perfil llegue en la mitad de los días o más
 *   (redondeando al más cercano, la plata quedaba en 2.450 y el medio solo la
 *   sacaba el 40 % de los días). No se tocan.
 * - Reglas 3: provisionalmente los mismos; L1 los recalcula con la misma regla
 *   ya con las piezas especiales.
 */
export const UMBRALES: Readonly<Record<number, Umbrales>> = {
  2: { bronce: 550, plata: 2400, oro: 4000 },
  3: { bronce: 550, plata: 2400, oro: 4000 },
};

/** Umbrales de las reglas actuales (`REGLAS`), los de las partidas nuevas. */
export const UMBRAL_BRONCE = UMBRALES[REGLAS]!.bronce;
export const UMBRAL_PLATA = UMBRALES[REGLAS]!.plata;
export const UMBRAL_ORO = UMBRALES[REGLAS]!.oro;
/** Congeladores de racha que se pueden tener a la vez. */
export const MAX_CONGELADORES = 2;

/** Medalla de unos puntos con los umbrales de `reglas` (por defecto, las actuales; una versión desconocida usa las actuales). */
export function medallaDePuntos(puntos: number, reglas: number = REGLAS): Medalla | null {
  const umbrales = UMBRALES[reglas] ?? UMBRALES[REGLAS]!;
  if (puntos >= umbrales.oro) return "oro";
  if (puntos >= umbrales.plata) return "plata";
  if (puntos >= umbrales.bronce) return "bronce";
  return null;
}

/** Medalla de un día guardado, con los umbrales de sus reglas (R16). Los de la v1 no tienen (I2). */
export function medallaDe(jugado: DiaJugado): Medalla | null {
  return jugado.reglas >= 2 ? medallaDePuntos(jugado.puntos, jugado.reglas) : null;
}

/** ¿Se puede jugar el día `dia` siendo hoy `hoy`? Del 1 a hoy, sí; los futuros, no. */
export function sePuedeJugar(dia: number, hoy: number): boolean {
  return Number.isInteger(dia) && dia >= 1 && dia <= hoy;
}

export type EstadoDia = "antes" | "futuro" | "sinJugar" | "enSuDia" | "atrasado";

/** Estado de un día en el calendario (D2). «Hoy» se marca aparte: puede estar sin jugar o jugado. */
export function estadoDia(p: Progreso, dia: number, hoy: number): EstadoDia {
  if (dia < 1) return "antes";
  if (dia > hoy) return "futuro";
  const jugado = p.diarios[dia];
  if (!jugado) return "sinJugar";
  return jugado.enSuDia ? "enSuDia" : "atrasado";
}

/**
 * Racha al abrir el día `hoy`: si faltan días desde el último y hay
 * congeladores para todos, se gasta uno por día y la racha sigue (el último
 * día cubierto pasa a ser ayer); si no llegan, la racha vuelve a 0 y los
 * congeladores se guardan.
 */
export function actualizarRacha(p: Progreso, hoy: number): Progreso {
  const { actual, ultimoDia, congeladores } = p.racha;
  if (actual === 0 || ultimoDia >= hoy - 1) return p;
  const perdidos = hoy - 1 - ultimoDia;
  if (perdidos <= congeladores) {
    return { ...p, racha: { ...p.racha, congeladores: congeladores - perdidos, ultimoDia: hoy - 1 } };
  }
  return { ...p, racha: { ...p.racha, actual: 0 } };
}

/** Racha que se muestra hoy, sin gastar congeladores: la guardada si sigue viva (hoy o ayer), si no 0. */
export function rachaDeHoy(p: Progreso, hoy: number): number {
  return actualizarRacha(p, hoy).racha.actual;
}

export type Oficial = {
  progreso: Progreso;
  /** Monedas ganadas: las de la partida más el premio del día. 0 si ya estaba jugado. */
  monedas: number;
  medalla: Medalla | null;
  /** `false` si el día ya tenía oficial: nada cambia. */
  nuevo: boolean;
};

/** Partida del reto diario acabada, con los índices de sus piezas colocadas. */
export type PartidaDiaria = PartidaAcabada & { altura: number; indices: readonly number[] };

/**
 * Guarda el intento oficial del día `dia` jugado hoy (`hoy`). Si es de hoy,
 * suma racha; si es atrasado, no. Las monedas son las de la partida más el
 * premio del día (con la racha nueva si es de hoy). Si el día ya estaba
 * jugado, no cambia nada.
 */
export function registrarOficial(p: Progreso, dia: number, hoy: number, partida: PartidaDiaria): Oficial {
  if (p.diarios[dia] || !sePuedeJugar(dia, hoy)) return { progreso: p, monedas: 0, medalla: null, nuevo: false };
  const enSuDia = dia === hoy;
  const conRacha = actualizarRacha(p, hoy);
  let racha = conRacha.racha;
  if (enSuDia) {
    const actual = racha.ultimoDia === hoy - 1 && racha.actual > 0 ? racha.actual + 1 : 1;
    racha = { ...racha, actual, mejor: Math.max(racha.mejor, actual), ultimoDia: hoy };
  }
  const medalla = medallaDePuntos(partida.puntos);
  const monedas =
    monedasDePartida({ ...partida, hitos: hitosDeAltura(partida.alturaMax) }) + premioDiario(medalla, enSuDia ? racha.actual : 0);
  const jugado: DiaJugado = {
    puntos: partida.puntos,
    piezas: partida.piezas,
    altura: Math.round(partida.altura * 1000) / 1000,
    perfectos: partida.perfectos,
    colocadas: aTramos(partida.indices),
    enSuDia,
    reglas: REGLAS,
  };
  const progreso = sumarEstadisticas(
    { ...conRacha, monedas: conRacha.monedas + monedas, racha, diarios: { ...conRacha.diarios, [dia]: jugado } },
    partida,
  );
  return { progreso, monedas, medalla, nuevo: true };
}

/** Una casilla del calendario: `null` es un hueco antes del día 1 del mes. */
export type Casilla = { fecha: string; diaDelMes: number; dia: number } | null;

/** Mes de la fecha `AAAA-MM-DD`: año y mes (1 a 12). */
export function mesDe(fecha: string): { anio: number; mes: number } {
  return { anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) };
}

/** Cuadrícula del mes con la semana empezando en lunes, y el número de reto de cada día. */
export function cuadriculaMes(anio: number, mes: number): Casilla[] {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  // getUTCDay: 0 es domingo; con lunes primero, el domingo va al final.
  const huecos = (primero.getUTCDay() + 6) % 7;
  const casillas: Casilla[] = Array.from({ length: huecos }, () => null);
  for (let d = 1; d <= dias; d++) {
    const fecha = `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    casillas.push({ fecha, diaDelMes: d, dia: numeroDia(fecha) });
  }
  return casillas;
}

/** Meses que se pueden ver: del de `DIA_1` al de hoy. `desplazamiento` 0 es el mes de hoy, -1 el anterior. */
export function mesVisible(hoy: number, desplazamiento: number): { anio: number; mes: number; primero: boolean; ultimo: boolean } {
  const actual = mesDe(fechaDeDia(hoy));
  const inicio = mesDe(DIA_1);
  const total = (actual.anio - inicio.anio) * 12 + (actual.mes - inicio.mes);
  const atras = Math.min(total, Math.max(0, -desplazamiento));
  const indice = actual.anio * 12 + (actual.mes - 1) - atras;
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1, primero: atras === total, ultimo: atras === 0 };
}
