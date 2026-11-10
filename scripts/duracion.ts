// Jugadores simulados para medir cuánto dura una partida y cuántos puntos da
// (B4). Cada perfil intenta soltar la pieza cuando pasa por el objetivo (el
// centro de la pieza más alta), la primera vez que pasa, con un error de tiempo
// aleatorio fijado por semilla: a más velocidad, el mismo error de tiempo aleja
// más la pieza del objetivo. Es orientativo: un jugador real también espera,
// duda o apunta a otro sitio.
import { crearGenerador, fechaDeDia } from "../src/logica/semilla.ts";
import { AMPLITUD, PASO, Partida, type OpcionesPartida } from "../src/logica/simulacion.ts";

export type Perfil = {
  nombre: string;
  /** El toque llega con un error uniforme entre -errorMs y +errorMs. */
  errorMs: number;
};

export const PERFILES: Perfil[] = [
  { nombre: "novato", errorMs: 180 },
  { nombre: "medio", errorMs: 90 },
  { nombre: "experto", errorMs: 40 },
];

/** Tope de seguridad: 30 minutos de partida. */
export const MAX_PASOS = 108_000;

export type Medida = {
  semilla: string;
  segundos: number;
  /** Piezas soltadas. */
  soltadas: number;
  /** Piezas colocadas (las que puntúan). */
  piezas: number;
  puntos: number;
  perfectos: number;
  monedas: number;
  alturaMax: number;
  terminada: boolean;
  /** Objetivo de nivel cumplido (E2); sin objetivo, `false`. */
  victoria: boolean;
  /** Segundo de la primera suelta (B2 de la tercera versión). */
  primeraS: number | null;
  /** Cadencia inicial: mediana de segundos entre las sueltas de las piezas 1 a 10 (B2). */
  cadenciaS: number | null;
  /** Segundo en que se coloca la décima pieza, o `null` si no llega (B2). */
  decimaS: number | null;
  /** Piezas especiales que han llegado a colgar (L1 de la tercera versión). */
  especiales: number;
};

/** Sueltas que miden la cadencia inicial: de la 1 a la 10. */
export const SUELTAS_CADENCIA = 10;

/** Pasos desde que aparece la pieza hasta que su centro pasa por `objetivo`. */
export function pasosHastaObjetivo(objetivo: number, velocidad: number, desdeDerecha: boolean): number {
  const distancia = desdeDerecha ? AMPLITUD - objetivo : objetivo + AMPLITUD;
  return Math.round(distancia / (velocidad * PASO));
}

/**
 * Juega una partida con el perfil dado. El azar del error depende solo de la
 * semilla, del perfil y del `intento` (E2 repite cada nivel con errores distintos).
 */
export function jugarConPerfil(semilla: string, perfil: Perfil, opciones: OpcionesPartida = {}, intento: number = 0): Medida {
  const azar = crearGenerador(intento === 0 ? `${semilla}|${perfil.nombre}` : `${semilla}|${perfil.nombre}|${intento}`);
  const partida = new Partida(semilla, opciones);
  let soltadas = 0;
  let pasoToque: number | null = null;
  const pasosSueltas: number[] = [];
  let colocadas = 0;
  let pasoDecima: number | null = null;
  let especiales = 0;
  while (!partida.terminada && partida.pasos < MAX_PASOS) {
    const { colgada, objetivo } = partida.estado();
    if (!colgada) {
      pasoToque = null;
    } else if (pasoToque === null) {
      // La pieza aparece en un extremo: el de la derecha si está en x > 0.
      const alObjetivo = pasosHastaObjetivo(objetivo, colgada.velocidad, colgada.x > 0);
      const error = Math.round(((azar() * 2 - 1) * perfil.errorMs) / (PASO * 1000));
      pasoToque = partida.pasos + Math.max(1, alObjetivo + error);
      if (colgada.especial) especiales++;
    }
    if (colgada && partida.pasos === pasoToque && partida.soltar()) soltadas++;
    partida.paso();
    for (const evento of partida.tomarEventos()) {
      if (evento.tipo === "soltada" && pasosSueltas.length < SUELTAS_CADENCIA) pasosSueltas.push(evento.paso);
      if (evento.tipo === "colocada" && ++colocadas === 10) pasoDecima = evento.paso;
    }
  }
  const { puntos, pasos, terminada, piezas, perfectos, monedas, alturaMax, victoria } = partida.resultado();
  const intervalos = pasosSueltas.slice(1).map((paso, i) => (paso - pasosSueltas[i]!) / 60);
  return {
    semilla,
    segundos: pasos / 60,
    soltadas,
    piezas,
    puntos,
    perfectos,
    monedas,
    alturaMax,
    terminada,
    victoria,
    primeraS: pasosSueltas.length > 0 ? pasosSueltas[0]! / 60 : null,
    cadenciaS: intervalos.length > 0 ? mediana(intervalos) : null,
    decimaS: pasoDecima === null ? null : pasoDecima / 60,
    especiales,
  };
}

export function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 1 ? orden[medio]! : (orden[medio - 1]! + orden[medio]!) / 2;
}

export type Medicion = { perfil: string; medianaS: number; medianaPuntos: number; medidas: Medida[] };

/** Mide el perfil en `dias` días seguidos desde `desde` (número de día del reto). */
export function medirPerfil(perfil: Perfil, dias: number, desde: number = 1): Medicion {
  const medidas = Array.from({ length: dias }, (_, i) => jugarConPerfil(fechaDeDia(desde + i), perfil));
  return {
    perfil: perfil.nombre,
    medianaS: mediana(medidas.map((m) => m.segundos)),
    medianaPuntos: mediana(medidas.map((m) => m.puntos)),
    medidas,
  };
}
