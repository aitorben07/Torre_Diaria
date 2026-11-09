// Niveles tipo saga (E1, Anexo 1, 6, con el recorte I1 de impacto): 10
// niveles en un mundo, el Puerto, con semilla fija, objetivo corto y tres
// estrellas. Los umbrales de estrellas `p2` y `p3` salen de `npm run
// medir:niveles` (E2, medido de nuevo el 2026-11-09), no a ojo (S26). Todo es puro: la página aplica
// `registrarNivel` al progreso con `Guardado.cambiar`.
import { premioNivel } from "./economia.ts";
import type { Progreso } from "./progreso.ts";
import type { Objetivo, OpcionesPartida } from "./simulacion.ts";
import type { FormasSecuencia } from "./piezas.ts";
import { VIDAS_INICIALES } from "./puntuacion.ts";
import { formatearNumero } from "./tarjeta.ts";

export type Nivel = {
  numero: number;
  /** Semilla fija, `nivel-<n>`: el mismo nivel tiene siempre las mismas piezas. */
  semilla: string;
  vidas: number;
  /** Velocidad de la primera pieza, en m/s. */
  velocidad: number;
  formas: FormasSecuencia;
  objetivo: Objetivo;
  /** Puntos para 2 y 3 estrellas (además de cumplir el objetivo). */
  p2: number;
  p3: number;
  /** El último del mundo: más largo. */
  jefe: boolean;
};

/** Un mundo en esta fase (I1): Puerto. Los mundos 2 y 3 serán más filas. */
export const MUNDO = "Puerto";

type Fila = Omit<Nivel, "numero" | "semilla" | "jefe">;

// Parten del Anexo 1, 6: 1) coloca 5; 2) 3 m; 3) 4 perfectos; 4) coloca 12; 5)
// combo de 4; 6) 8 m con 2 vidas; 7) coloca 12 con 1 vida; 8) 600 puntos; 9) 10
// m con como mucho 18 piezas; 10) 14 m con 2 vidas (jefe). Los tres primeros,
// lentos y solo con las formas estables. El 3 y el 5 piden 4 y no 2 o 3 (E2):
// con menos, los puntos al ganar son siempre los mismos y no hay hueco para dos
// umbrales. Del 4 en adelante la pieza empieza a 1,6-1,8 m/s y los objetivos
// son más largos que en el Anexo: más despacio, el medio simulado hace siempre
// perfecto, empata con el experto y saca 3 estrellas siempre; así las 3
// estrellas piden no fallar ningún perfecto y el medio gana cada nivel en 6 de
// 10 o más, con una mediana de 30 s o más al ganar (E2).
// En el 8, ganar ya supera `p3` (los puntos son el objetivo): da 3 estrellas.
const FILAS: Fila[] = [
  { vidas: 3, velocidad: 0.9, formas: "faciles", objetivo: { tipo: "piezas", piezas: 5 }, p2: 150, p3: 200 },
  { vidas: 3, velocidad: 0.9, formas: "faciles", objetivo: { tipo: "altura", metros: 3 }, p2: 50, p3: 100 },
  { vidas: 3, velocidad: 0.9, formas: "faciles", objetivo: { tipo: "perfectos", perfectos: 4 }, p2: 50, p3: 100 },
  { vidas: 3, velocidad: 1.7, formas: "todas", objetivo: { tipo: "piezas", piezas: 12 }, p2: 600, p3: 650 },
  { vidas: 3, velocidad: 1.0, formas: "todas", objetivo: { tipo: "combo", combo: 4 }, p2: 50, p3: 100 },
  { vidas: 2, velocidad: 1.7, formas: "todas", objetivo: { tipo: "altura", metros: 8 }, p2: 650, p3: 750 },
  { vidas: 1, velocidad: 1.8, formas: "todas", objetivo: { tipo: "piezas", piezas: 12 }, p2: 550, p3: 650 },
  { vidas: 3, velocidad: 1.6, formas: "todas", objetivo: { tipo: "puntos", puntos: 600 }, p2: 550, p3: 600 },
  { vidas: 3, velocidad: 1.7, formas: "todas", objetivo: { tipo: "alturaConPiezas", metros: 10, piezas: 18 }, p2: 850, p3: 900 },
  { vidas: 2, velocidad: 1.6, formas: "todas", objetivo: { tipo: "altura", metros: 14 }, p2: 1050, p3: 1100 },
];

export const NIVELES: readonly Nivel[] = FILAS.map((fila, i) => ({
  ...fila,
  numero: i + 1,
  semilla: `nivel-${i + 1}`,
  jefe: i === FILAS.length - 1,
}));

export const ESTRELLAS_POR_NIVEL = 3;
/** Primer nivel con piezas especiales (H1). */
export const NIVEL_ESPECIALES = 4;

export function nivelPorNumero(numero: number): Nivel | null {
  return NIVELES[numero - 1] ?? null;
}

/** Opciones de la partida del nivel: van en `data-opciones` y bastan para repetirla con `jugar` (G3). */
export function opcionesDeNivel(nivel: Nivel): OpcionesPartida {
  const opciones: OpcionesPartida = { vidas: nivel.vidas, velocidad: nivel.velocidad, formas: nivel.formas, objetivo: nivel.objetivo };
  // Sin piezas especiales hasta el nivel 4 (H1, Anexo G).
  return nivel.numero < NIVEL_ESPECIALES ? { ...opciones, especiales: false } : opciones;
}

/** Estrellas de una partida: 0 sin cumplir el objetivo; 1 al cumplirlo; 2 con `p2` puntos; 3 con `p3`. */
export function estrellasDe(nivel: Nivel, { victoria, puntos }: { victoria: boolean; puntos: number }): number {
  if (!victoria) return 0;
  if (puntos >= nivel.p3) return 3;
  if (puntos >= nivel.p2) return 2;
  return 1;
}

/** Mejores estrellas guardadas del nivel (0 si no se ha completado). */
export function estrellasGuardadas(p: Progreso, numero: number): number {
  return p.niveles[numero] ?? 0;
}

export function totalEstrellas(p: Progreso): number {
  return NIVELES.reduce((suma, n) => suma + estrellasGuardadas(p, n.numero), 0);
}

/** El nivel 1 siempre; el n+1, al completar el n (impacto: sin condiciones de estrellas por mundo). */
export function nivelDisponible(p: Progreso, numero: number): boolean {
  if (!nivelPorNumero(numero)) return false;
  return numero === 1 || estrellasGuardadas(p, numero - 1) >= 1;
}

/** El último nivel que se puede jugar: el que se centra al abrir el mapa (E3). */
export function ultimoDisponible(p: Progreso): number {
  let ultimo = 1;
  for (const n of NIVELES) if (nivelDisponible(p, n.numero)) ultimo = n.numero;
  return ultimo;
}

/** ¿Están todos los niveles con 3 estrellas? */
export function mundoCompleto(p: Progreso): boolean {
  return NIVELES.every((n) => estrellasGuardadas(p, n.numero) >= ESTRELLAS_POR_NIVEL);
}

export type NivelRegistrado = {
  progreso: Progreso;
  /** Estrellas que mejoran la mejor marca: dan monedas. */
  nuevas: number;
  monedas: number;
  /** Esta partida completa el mundo con 3 estrellas en todo (+200 una vez). */
  mundoCompletado: boolean;
};

/**
 * Guarda la mejor marca de estrellas del nivel y cobra las nuevas (20 cada una)
 * y el mundo completo (Anexo 1, 4.2). Repetir sin mejorar no da nada.
 */
export function registrarNivel(p: Progreso, numero: number, estrellas: number): NivelRegistrado {
  const antes = estrellasGuardadas(p, numero);
  const mejor = Math.max(antes, Math.min(ESTRELLAS_POR_NIVEL, Math.max(0, Math.trunc(estrellas))));
  if (!nivelPorNumero(numero) || mejor === antes) return { progreso: p, nuevas: 0, monedas: 0, mundoCompletado: false };
  const nuevas = mejor - antes;
  const conNivel: Progreso = { ...p, niveles: { ...p.niveles, [numero]: mejor } };
  const mundoCompletado = !mundoCompleto(p) && mundoCompleto(conNivel);
  const monedas = premioNivel(nuevas, mundoCompletado);
  return { progreso: { ...conNivel, monedas: conNivel.monedas + monedas }, nuevas, monedas, mundoCompletado };
}

function metros(valor: number): string {
  return `${formatearNumero(valor)} m`;
}

function cuenta(n: number, una: string, varias: string): string {
  return `${formatearNumero(n)} ${n === 1 ? una : varias}`;
}

/** El objetivo en una frase corta, como mucho 40 caracteres (E3): «Llega a 6 m con 2 vidas». */
export function textoObjetivo(nivel: Pick<Nivel, "objetivo" | "vidas">): string {
  const o = nivel.objetivo;
  let frase: string;
  if (o.tipo === "piezas") frase = `Coloca ${cuenta(o.piezas, "pieza", "piezas")}`;
  else if (o.tipo === "altura") frase = `Llega a ${metros(o.metros)}`;
  else if (o.tipo === "perfectos") frase = `Haz ${cuenta(o.perfectos, "perfecto", "perfectos")}`;
  else if (o.tipo === "combo") frase = `Haz un combo de ${o.combo}`;
  else if (o.tipo === "puntos") frase = `Consigue ${cuenta(o.puntos, "punto", "puntos")}`;
  else frase = `Llega a ${metros(o.metros)} en ${cuenta(o.piezas, "pieza", "piezas")}`;
  if (nivel.vidas < VIDAS_INICIALES) frase += ` con ${cuenta(nivel.vidas, "vida", "vidas")}`;
  return frase;
}

/** El objetivo en corto para el HUD (E3): «Meta: 5 piezas», «Meta: 8 m en 12». */
export function textoMeta(nivel: Pick<Nivel, "objetivo">): string {
  const o = nivel.objetivo;
  if (o.tipo === "piezas") return `Meta: ${cuenta(o.piezas, "pieza", "piezas")}`;
  if (o.tipo === "altura") return `Meta: ${metros(o.metros)}`;
  if (o.tipo === "perfectos") return `Meta: ${cuenta(o.perfectos, "perfecto", "perfectos")}`;
  if (o.tipo === "combo") return `Meta: combo ×${o.combo}`;
  if (o.tipo === "puntos") return `Meta: ${cuenta(o.puntos, "punto", "puntos")}`;
  return `Meta: ${metros(o.metros)} en ${o.piezas}`;
}
