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

/** `localStorage` si existe y se puede tocar; si no, `null`. */
export function almacenDelNavegador(): Almacen | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
