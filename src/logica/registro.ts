// Resultado oficial del día guardado en el navegador (D4). Una sola clave; si
// el almacenamiento falla (modo privado, cuota) el juego sigue sin guardar.
import { FORMAS, PALETA, type Forma } from "./piezas.ts";

export const CLAVE = "torre-diaria:resultado";

/** Lo mínimo de `Storage` que se usa: en el navegador, `localStorage`. */
export type Almacen = Pick<Storage, "getItem" | "setItem">;

export type ResultadoDia = {
  dia: number;
  puntos: number;
  altura: number;
  formas: Array<{ forma: Forma; color: number }>;
};

function esEnteroNoNegativo(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0;
}

function esResultado(valor: unknown): valor is ResultadoDia {
  if (typeof valor !== "object" || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    esEnteroNoNegativo(r.dia) &&
    esEnteroNoNegativo(r.puntos) &&
    typeof r.altura === "number" &&
    Number.isFinite(r.altura) &&
    Array.isArray(r.formas) &&
    r.formas.every(
      (f: unknown) =>
        typeof f === "object" &&
        f !== null &&
        FORMAS.includes((f as { forma: Forma }).forma) &&
        esEnteroNoNegativo((f as { color: unknown }).color) &&
        (f as { color: number }).color < PALETA.length,
    )
  );
}

/** Resultado oficial del día `dia`, o `null` si no se ha jugado o no se puede leer. */
export function leerResultado(almacen: Almacen | null, dia: number): ResultadoDia | null {
  try {
    const texto = almacen?.getItem(CLAVE);
    if (!texto) return null;
    const valor: unknown = JSON.parse(texto);
    if (!esResultado(valor) || valor.dia !== dia) return null;
    return { dia: valor.dia, puntos: valor.puntos, altura: valor.altura, formas: valor.formas };
  } catch {
    return null;
  }
}

/** Guarda el resultado oficial. Devuelve `false` si no se ha podido. */
export function guardarResultado(almacen: Almacen | null, resultado: ResultadoDia): boolean {
  try {
    if (!almacen) return false;
    const { dia, puntos, altura, formas } = resultado;
    almacen.setItem(CLAVE, JSON.stringify({ dia, puntos, altura, formas }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Récord de la partida libre y si ya se ha visto el aviso «Toca para soltar»
 * (B5). Va en su propia clave hasta que el guardado v2 (C1) lo pase a
 * `torre-diaria:progreso`.
 */
export const CLAVE_LIBRE = "torre-diaria:libre";

export type RegistroLibre = { record: number; tutorialVisto: boolean };

export const REGISTRO_LIBRE_VACIO: RegistroLibre = { record: 0, tutorialVisto: false };

/** Lo guardado de la partida libre; si falta o no se puede leer, el registro vacío. */
export function leerRegistroLibre(almacen: Almacen | null): RegistroLibre {
  try {
    const texto = almacen?.getItem(CLAVE_LIBRE);
    if (!texto) return { ...REGISTRO_LIBRE_VACIO };
    const valor: unknown = JSON.parse(texto);
    if (typeof valor !== "object" || valor === null) return { ...REGISTRO_LIBRE_VACIO };
    const r = valor as Record<string, unknown>;
    return {
      record: esEnteroNoNegativo(r.record) ? r.record : 0,
      tutorialVisto: r.tutorialVisto === true,
    };
  } catch {
    return { ...REGISTRO_LIBRE_VACIO };
  }
}

/** Guarda lo de la partida libre. Devuelve `false` si no se ha podido. */
export function guardarRegistroLibre(almacen: Almacen | null, registro: RegistroLibre): boolean {
  try {
    if (!almacen) return false;
    almacen.setItem(CLAVE_LIBRE, JSON.stringify({ record: registro.record, tutorialVisto: registro.tutorialVisto }));
    return true;
  } catch {
    return false;
  }
}

/** `localStorage` si existe y se puede tocar; si no, `null`. */
export function almacenDelNavegador(): Almacen | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
