// Enlaces de «reta a un amigo»: `?reto=<dia>.<puntos>` (D7) para el reto
// diario y `?libre=<código>.<puntos>` (F2) para una partida libre. Quien lo
// abre juega las mismas piezas y ve la puntuación a batir. Los niveles enlazan
// a la página principal (S19). Lo que no encaja en el formato se ignora.
import { FORMATO_CODIGO } from "./semilla.ts";

export type Reto = { dia: number; puntos: number };
/** `semilla` es el código de la partida libre (no la semilla completa `libre-<código>`). */
export type Libre = { semilla: string; puntos: number };

const LARGO_MAXIMO = 20;
/** Día desde 1 y puntos de 0 a 999.999 (D3), sin ceros a la izquierda. */
const FORMATO = /^([1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
/** Código de 1 a 7 caracteres `[0-9a-z]` y puntos como en el reto. */
const FORMATO_LIBRE = /^([0-9a-z]{1,7})\.(0|[1-9]\d{0,5})$/;

/** Parte de búsqueda del enlace, por ejemplo `?reto=12.34`. */
export function crearReto(dia: number, puntos: number): string {
  return `?reto=${dia}.${puntos}`;
}

/** Parte de búsqueda del enlace de una partida libre, por ejemplo `?libre=a1b2c3.1240`. */
export function crearLibre(semilla: string, puntos: number): string {
  return `?libre=${semilla}.${puntos}`;
}

/** Valor del parámetro `nombre` de un enlace completo o de su parte de búsqueda. */
function parametro(enlace: string, nombre: string): string | null {
  const inicio = enlace.indexOf("?");
  return new URLSearchParams(inicio >= 0 ? enlace.slice(inicio) : enlace).get(nombre);
}

/** Lee la partida libre de un enlace; `null` si falta, es larga o no encaja en el formato. */
export function leerLibre(enlace: string): Libre | null {
  const valor = parametro(enlace, "libre");
  if (valor === null || valor.length > LARGO_MAXIMO) return null;
  const partes = FORMATO_LIBRE.exec(valor);
  if (!partes || !FORMATO_CODIGO.test(partes[1]!)) return null;
  return { semilla: partes[1]!, puntos: Number(partes[2]) };
}

/**
 * Lee el reto de un enlace completo o de su parte de búsqueda. Devuelve `null`
 * si falta, tiene otro formato o es de un día posterior a `hoy`.
 */
export function leerReto(enlace: string, hoy: number): Reto | null {
  const valor = parametro(enlace, "reto");
  if (valor === null || valor.length > LARGO_MAXIMO) return null;
  const partes = FORMATO.exec(valor);
  if (!partes) return null;
  const dia = Number(partes[1]);
  const puntos = Number(partes[2]);
  if (dia > hoy) return null;
  return { dia, puntos };
}
