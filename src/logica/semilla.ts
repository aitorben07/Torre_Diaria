// Fecha UTC, número de día y generador determinista. Sin dependencias del
// navegador: lo usan la pantalla, las pruebas en Node y, en la segunda fase, el
// servidor (D3). Cambiar el hash o el generador cambia las piezas de los días
// ya compartidos: las pruebas doradas de `semilla.test.ts` lo detectan.

/** Día 1 del reto (D5). Cambiarlo tras publicar cambia los números de los días. */
export const DIA_1 = "2026-11-05";

const MS_POR_DIA = 86_400_000;

/** `AAAA-MM-DD` del día UTC de `fecha`, sin depender de la zona del equipo. */
export function fechaUTC(fecha: Date): string {
  const anio = String(fecha.getUTCFullYear()).padStart(4, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function msDeFecha(fecha: string): number {
  return Date.parse(`${fecha}T00:00:00Z`);
}

/** Número de día del reto: `DIA_1` es el 1. */
export function numeroDia(fecha: string): number {
  return Math.round((msDeFecha(fecha) - msDeFecha(DIA_1)) / MS_POR_DIA) + 1;
}

/** Inversa de `numeroDia`: la fecha UTC del día `dia`. */
export function fechaDeDia(dia: number): string {
  return fechaUTC(new Date(msDeFecha(DIA_1) + (dia - 1) * MS_POR_DIA));
}

/** FNV-1a de 32 bits: texto a entero sin signo. */
export function hashTexto(texto: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Generador mulberry32: devuelve números en [0, 1) a partir de una semilla de 32 bits. */
export function mulberry32(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Generador de la semilla de texto (la fecha UTC del día o una de partida libre). */
export function crearGenerador(semilla: string): () => number {
  return mulberry32(hashTexto(semilla));
}

/** Semilla aleatoria de partida libre. Es el único uso de `Math.random` en la lógica. */
export function semillaLibre(): string {
  return `libre-${Math.floor(Math.random() * 4_294_967_296).toString(36)}`;
}
