// Enlace de «reta a un amigo»: `?reto=<dia>.<puntos>` (D7). Quien lo abre juega
// las piezas del día del reto y ve la puntuación a batir.

export type Reto = { dia: number; puntos: number };

const LARGO_MAXIMO = 20;
/** Día desde 1 y puntos de 0 a 999.999 (D3), sin ceros a la izquierda. */
const FORMATO = /^([1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;

/** Parte de búsqueda del enlace, por ejemplo `?reto=12.34`. */
export function crearReto(dia: number, puntos: number): string {
  return `?reto=${dia}.${puntos}`;
}

/**
 * Lee el reto de un enlace completo o de su parte de búsqueda. Devuelve `null`
 * si falta, tiene otro formato o es de un día posterior a `hoy`.
 */
export function leerReto(enlace: string, hoy: number): Reto | null {
  const inicio = enlace.indexOf("?");
  const valor = new URLSearchParams(inicio >= 0 ? enlace.slice(inicio) : enlace).get("reto");
  if (valor === null || valor.length > LARGO_MAXIMO) return null;
  const partes = FORMATO.exec(valor);
  if (!partes) return null;
  const dia = Number(partes[1]);
  const puntos = Number(partes[2]);
  if (dia > hoy) return null;
  return { dia, puntos };
}
