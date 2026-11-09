// Lo que guardaban la v1 y los primeros bloques de la v2, solo para leerlo: el
// guardado v2 (`progreso.ts`, C1) lo migra a `torre-diaria:progreso` y ya no se
// escribe en estas claves, que tampoco se borran (S20). Si el almacenamiento
// falla (modo privado, cuota), la lectura da `null` o el registro vacío.
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

/** El último resultado oficial que guardó la v1, sea del día que sea (para la migración). */
export function leerResultadoV1(almacen: Almacen | null): ResultadoDia | null {
  try {
    const texto = almacen?.getItem(CLAVE);
    if (!texto) return null;
    const valor: unknown = JSON.parse(texto);
    if (!esResultado(valor)) return null;
    return { dia: valor.dia, puntos: valor.puntos, altura: valor.altura, formas: valor.formas };
  } catch {
    return null;
  }
}

/**
 * Récord de la partida libre y si ya se ha visto el aviso «Toca para soltar»,
 * como los guardaba el bloque B5 antes del guardado v2.
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

/** `localStorage` si existe y se puede tocar; si no, `null`. */
export function almacenDelNavegador(): Almacen | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
