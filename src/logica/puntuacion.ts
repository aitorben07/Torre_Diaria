// Reglas de puntos, combo y vidas de la partida (B2, Anexo 1, 2.2 y 2.3). Es
// lógica pura, sin física: `simulacion.ts` le dice qué calidad tuvo cada pieza
// colocada, qué altura tiene la torre y cuándo hay una caída, y el marcador
// lleva la cuenta. Así los ejemplos del Anexo 1 se prueban sin planck.
import { MONEDAS_DORADA } from "./especiales.ts";

export type Calidad = "perfecto" | "bueno" | "normal";

/** Distancia máxima en metros al objetivo para un perfecto y para un bueno. */
export const TOLERANCIA_PERFECTO = 0.16;
export const TOLERANCIA_PERFECTO_FINAL = 0.08;
export const TOLERANCIA_BUENO = 0.35;
/** Desde esta pieza (índice desde 0, como la velocidad) vale `TOLERANCIA_PERFECTO_FINAL`. */
export const PIEZA_PERFECTO_FINAL = 100;

export const VIDAS_INICIALES = 3;
/** Las vidas extra no pasan de aquí. */
export const VIDAS_MAX = 3;
/** Cada tantos perfectos seguidos, una vida extra. */
export const PERFECTOS_POR_VIDA = 5;

export const PUNTOS_COLOCADA = 10;
export const PUNTOS_PERFECTO = 10;
export const COMBO_MAX_PUNTOS = 5;
export const PUNTOS_BUENO = 5;
export const METROS_HITO = 5;
export const PUNTOS_HITO = 50;

/** Monedas de la partida (Anexo 1, 4.2): las cobra el bloque C. */
export const MONEDAS_COLOCADA = 1;
export const MONEDAS_PERFECTO = 1;
export const MONEDAS_HITO = 5;

/** Calidad de una suelta a `distancia` metros del objetivo, para la pieza `indice`. */
export function calidadDeSuelta(distancia: number, indice: number): Calidad {
  const perfecto = indice >= PIEZA_PERFECTO_FINAL ? TOLERANCIA_PERFECTO_FINAL : TOLERANCIA_PERFECTO;
  if (distancia <= perfecto) return "perfecto";
  if (distancia <= TOLERANCIA_BUENO) return "bueno";
  return "normal";
}

/** Puntos de una pieza colocada; `combo` es el de después de colocarla (1 en el primer perfecto). */
export function puntosDeColocada(calidad: Calidad, combo: number): number {
  if (calidad === "perfecto") return PUNTOS_COLOCADA + PUNTOS_PERFECTO * Math.min(combo, COMBO_MAX_PUNTOS);
  if (calidad === "bueno") return PUNTOS_COLOCADA + PUNTOS_BUENO;
  return PUNTOS_COLOCADA;
}

export type Colocacion = { puntos: number; combo: number; vidaExtra: boolean };

/** Cuenta de puntos, combo, vidas, hitos y estadísticas de una partida. */
export class Marcador {
  puntos = 0;
  piezas = 0;
  perfectos = 0;
  combo = 0;
  comboMax = 0;
  alturaMax = 0;
  /** Hitos de `METROS_HITO` ya cobrados. */
  hitos = 0;
  /** Piezas doradas colocadas (H2). */
  doradas = 0;
  vidas: number;

  constructor(vidas: number = VIDAS_INICIALES) {
    this.vidas = vidas;
  }

  /**
   * Una pieza cuenta como colocada: suma sus puntos y, cada 5 perfectos
   * seguidos, una vida si faltan. Una dorada (H2) vale el doble de puntos de
   * colocada y da `MONEDAS_DORADA` monedas más.
   */
  colocar(calidad: Calidad, { dorada = false }: { dorada?: boolean } = {}): Colocacion {
    this.piezas++;
    this.combo = calidad === "perfecto" ? this.combo + 1 : 0;
    this.comboMax = Math.max(this.comboMax, this.combo);
    if (calidad === "perfecto") this.perfectos++;
    const puntos = puntosDeColocada(calidad, this.combo) * (dorada ? 2 : 1);
    if (dorada) this.doradas++;
    this.puntos += puntos;
    const vidaExtra = this.combo > 0 && this.combo % PERFECTOS_POR_VIDA === 0 && this.vidas < VIDAS_MAX;
    if (vidaExtra) this.vidas++;
    return { puntos, combo: this.combo, vidaExtra };
  }

  /** Altura de la torre tras colocar una pieza. Devuelve los metros de cada hito nuevo (se cobran una vez). */
  medirAltura(altura: number): number[] {
    this.alturaMax = Math.max(this.alturaMax, altura);
    const nuevos: number[] = [];
    while ((this.hitos + 1) * METROS_HITO <= this.alturaMax) {
      this.hitos++;
      this.puntos += PUNTOS_HITO;
      nuevos.push(this.hitos * METROS_HITO);
    }
    return nuevos;
  }

  /** Seguir tras perder la última vida (I1): una vida, sin tocar lo ganado. */
  seguir(): void {
    this.vidas = 1;
    this.combo = 0;
  }

  /** Un episodio de caída: una vida menos y el combo a 0. Lo ganado no se resta. */
  caer(): number {
    this.vidas = Math.max(0, this.vidas - 1);
    this.combo = 0;
    return this.vidas;
  }

  get monedas(): number {
    return this.piezas * MONEDAS_COLOCADA + this.perfectos * MONEDAS_PERFECTO + this.hitos * MONEDAS_HITO + this.doradas * MONEDAS_DORADA;
  }
}
