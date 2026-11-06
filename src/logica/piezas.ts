// Secuencia de piezas del día. Es igual para todos porque solo depende de la
// semilla. Cambiar cualquier constante de este archivo cambia las piezas de los
// días ya compartidos: la prueba dorada de `piezas.test.ts` lo detecta.
import { crearGenerador } from "./semilla.ts";

export const FORMAS = ["bloque", "tablon", "cuadrado", "triangulo", "columna"] as const;
export type Forma = (typeof FORMAS)[number];

/** Medidas en metros de cada forma. En el cuadrado, el alto es el ancho. */
export const CATALOGO: Record<Forma, { ancho: [number, number]; alto: [number, number] }> = {
  bloque: { ancho: [0.9, 1.3], alto: [0.6, 0.9] },
  tablon: { ancho: [1.6, 2.2], alto: [0.25, 0.4] },
  cuadrado: { ancho: [0.7, 1.0], alto: [0.7, 1.0] },
  triangulo: { ancho: [1.0, 1.5], alto: [0.6, 0.9] },
  columna: { ancho: [0.4, 0.6], alto: [1.0, 1.4] },
};

export const ANCHO_MIN = 0.4;
export const ANCHO_MAX = 2.2;
export const ALTO_MIN = 0.25;
export const ALTO_MAX = 1.4;

/** El «triángulo» tiene la cima plana para que se pueda apilar encima. */
export const CIMA_TRIANGULO = 0.5;

/**
 * Velocidad de vaivén en m/s: `min(VEL_TOPE, VEL_MIN + VEL_INCREMENTO · i)`,
 * con `i` el índice de la pieza desde 0 (B3). Ajustada con `npm run
 * medir:duracion` para los objetivos de duración de cada perfil (B4).
 */
export const VEL_MIN = 1.0;
export const VEL_TOPE = 3.4;
export const VEL_INCREMENTO = 0.03;

/** Paleta fija: cada color va ligado al emoji de la tarjeta (como mucho 9). */
export const PALETA = [
  { relleno: "#e74c3c", emoji: "🟥" },
  { relleno: "#f39c12", emoji: "🟧" },
  { relleno: "#f4d03f", emoji: "🟨" },
  { relleno: "#27ae60", emoji: "🟩" },
  { relleno: "#2e86de", emoji: "🟦" },
  { relleno: "#8e44ad", emoji: "🟪" },
  { relleno: "#8d6e63", emoji: "🟫" },
] as const;

export type Pieza = {
  forma: Forma;
  ancho: number;
  alto: number;
  /** Índice en `PALETA`. */
  color: number;
  velocidad: number;
};

/** Piezas que da `generarSecuencia` si no se pide otro número. La partida las genera bajo demanda. */
export const PIEZAS_POR_PARTIDA = 600;

/** Las primeras piezas solo salen de las formas más estables, sin triángulo ni columna (D6). */
export const FORMAS_INICIALES: readonly Forma[] = ["bloque", "tablon", "cuadrado"];
export const PIEZAS_INICIALES = 5;

/**
 * Formas por tramos de 10 piezas (B3, Anexo 1, 2.4): tras las iniciales, el
 * triángulo («trapecio» en los textos) y la columna salen cada uno con
 * probabilidad `PROB_DIFICIL_INICIAL`, que sube `PROB_DIFICIL_TRAMO` por tramo
 * hasta `PROB_DIFICIL_TOPE`. El resto se reparte entre las formas iniciales.
 */
export const PIEZAS_POR_TRAMO = 10;
export const PROB_DIFICIL_INICIAL = 0.1;
export const PROB_DIFICIL_TRAMO = 0.03;
export const PROB_DIFICIL_TOPE = 0.25;

function centesimas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function entre(azar: () => number, [min, max]: [number, number]): number {
  return centesimas(min + azar() * (max - min));
}

export function velocidadDePieza(indice: number): number {
  return Math.min(VEL_TOPE, centesimas(VEL_MIN + VEL_INCREMENTO * indice));
}

/** Probabilidad de triángulo (y la misma de columna) de la pieza `indice`; 0 en las iniciales. */
export function probabilidadDificil(indice: number): number {
  if (indice < PIEZAS_INICIALES) return 0;
  const tramo = Math.floor(indice / PIEZAS_POR_TRAMO);
  return Math.min(PROB_DIFICIL_TOPE, PROB_DIFICIL_INICIAL + PROB_DIFICIL_TRAMO * tramo);
}

/** Forma de la pieza `indice` a partir de un valor de azar en [0, 1). */
function elegirForma(indice: number, valor: number): Forma {
  const dificil = probabilidadDificil(indice);
  if (valor < dificil) return "triangulo";
  if (valor < 2 * dificil) return "columna";
  const resto = (valor - 2 * dificil) / (1 - 2 * dificil);
  return FORMAS_INICIALES[Math.min(FORMAS_INICIALES.length - 1, Math.floor(resto * FORMAS_INICIALES.length))]!;
}

/**
 * Secuencia sin fin de piezas de una semilla, generada bajo demanda. Las piezas
 * salen en orden de un único generador, así que las primeras `k` son las mismas
 * se generen cuantas se generen (B3).
 */
export class Secuencia {
  private readonly azar: () => number;
  private readonly piezas: Pieza[] = [];

  constructor(semilla: string) {
    this.azar = crearGenerador(semilla);
  }

  pieza(indice: number): Pieza {
    while (this.piezas.length <= indice) this.piezas.push(this.siguiente(this.piezas.length));
    return this.piezas[indice]!;
  }

  private siguiente(i: number): Pieza {
    const { azar } = this;
    const forma = elegirForma(i, azar());
    const medidas = CATALOGO[forma];
    const ancho = entre(azar, medidas.ancho);
    const alto = forma === "cuadrado" ? ancho : entre(azar, medidas.alto);
    const color = Math.floor(azar() * PALETA.length);
    return { forma, ancho, alto, color, velocidad: velocidadDePieza(i) };
  }
}

export function generarSecuencia(semilla: string, n: number = PIEZAS_POR_PARTIDA): Pieza[] {
  const secuencia = new Secuencia(semilla);
  return Array.from({ length: n }, (_, i) => secuencia.pieza(i));
}

/** Vértices en sentido antihorario, relativos al centro de la caja de la pieza. */
export function verticesPieza(pieza: Pick<Pieza, "forma" | "ancho" | "alto">): Array<{ x: number; y: number }> {
  const x = pieza.ancho / 2;
  const y = pieza.alto / 2;
  if (pieza.forma === "triangulo") {
    const cima = x * CIMA_TRIANGULO;
    return [
      { x: -x, y: -y },
      { x, y: -y },
      { x: cima, y },
      { x: -cima, y },
    ];
  }
  return [
    { x: -x, y: -y },
    { x, y: -y },
    { x, y },
    { x: -x, y },
  ];
}
