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
export const CIMA_TRIANGULO = 0.3;

/** Velocidad de vaivén en m/s: crece con cada pieza hasta el tope. */
export const VEL_MIN = 2;
export const VEL_MAX = 5;
export const VEL_INCREMENTO = 0.08;

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

export const PIEZAS_POR_PARTIDA = 300;

function centesimas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function entre(azar: () => number, [min, max]: [number, number]): number {
  return centesimas(min + azar() * (max - min));
}

export function velocidadDePieza(indice: number): number {
  return Math.min(VEL_MAX, centesimas(VEL_MIN + VEL_INCREMENTO * indice));
}

export function generarSecuencia(semilla: string, n: number = PIEZAS_POR_PARTIDA): Pieza[] {
  const azar = crearGenerador(semilla);
  const piezas: Pieza[] = [];
  for (let i = 0; i < n; i++) {
    const forma = FORMAS[Math.floor(azar() * FORMAS.length)]!;
    const medidas = CATALOGO[forma];
    const ancho = entre(azar, medidas.ancho);
    const alto = forma === "cuadrado" ? ancho : entre(azar, medidas.alto);
    const color = Math.floor(azar() * PALETA.length);
    piezas.push({ forma, ancho, alto, color, velocidad: velocidadDePieza(i) });
  }
  return piezas;
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
