import { describe, expect, it } from "vitest";
import {
  CLAVE,
  CLAVE_LIBRE,
  guardarRegistroLibre,
  guardarResultado,
  leerRegistroLibre,
  leerResultado,
  type Almacen,
  type ResultadoDia,
} from "./registro.ts";

function almacenEnMemoria(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
  };
}

const HOY: ResultadoDia = {
  dia: 7,
  puntos: 3,
  altura: 2.345,
  formas: [
    { forma: "bloque", color: 0 },
    { forma: "tablon", color: 4 },
    { forma: "triangulo", color: 6 },
  ],
};

describe("registro", () => {
  it("guardar y leer el resultado de hoy devuelve los mismos datos", () => {
    const almacen = almacenEnMemoria();
    expect(guardarResultado(almacen, HOY)).toBe(true);
    expect(leerResultado(almacen, 7)).toEqual(HOY);
  });

  it("el resultado de ayer no cuenta como jugado hoy", () => {
    const almacen = almacenEnMemoria();
    guardarResultado(almacen, { ...HOY, dia: 6 });
    expect(leerResultado(almacen, 7)).toBeNull();
  });

  it("un almacenamiento que lanza error no propaga la excepción", () => {
    const roto: Almacen = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(guardarResultado(roto, HOY)).toBe(false);
    expect(leerResultado(roto, 7)).toBeNull();
    expect(leerResultado(null, 7)).toBeNull();
    expect(guardarResultado(null, HOY)).toBe(false);
  });

  it.each([
    "{no es json",
    "null",
    "[]",
    JSON.stringify({ dia: 7, puntos: 3 }),
    JSON.stringify({ ...HOY, puntos: "3" }),
    JSON.stringify({ ...HOY, altura: null }),
    JSON.stringify({ ...HOY, formas: [{ forma: "esfera", color: 0 }] }),
    JSON.stringify({ ...HOY, formas: [{ forma: "bloque", color: 99 }] }),
  ])("ignora datos corruptos: %s", (texto) => {
    const almacen = almacenEnMemoria();
    almacen.datos.set(CLAVE, texto);
    expect(leerResultado(almacen, 7)).toBeNull();
  });

  it("solo usa una clave con prefijo torre-diaria: y no guarda nada más", () => {
    const almacen = almacenEnMemoria();
    guardarResultado(almacen, { ...HOY, extra: "no" } as ResultadoDia);
    guardarResultado(almacen, { ...HOY, dia: 8 });
    expect([...almacen.datos.keys()]).toEqual([CLAVE]);
    expect(CLAVE.startsWith("torre-diaria:")).toBe(true);
    expect(Object.keys(JSON.parse(almacen.datos.get(CLAVE)!))).toEqual(["dia", "puntos", "altura", "formas"]);
  });
});

describe("registro de la partida libre (B5)", () => {
  it("guardar y leer devuelve el récord y el aviso visto, en su propia clave", () => {
    const almacen = almacenEnMemoria();
    expect(leerRegistroLibre(almacen)).toEqual({ record: 0, tutorialVisto: false });
    expect(guardarRegistroLibre(almacen, { record: 540, tutorialVisto: true })).toBe(true);
    expect(leerRegistroLibre(almacen)).toEqual({ record: 540, tutorialVisto: true });
    expect([...almacen.datos.keys()]).toEqual([CLAVE_LIBRE]);
    expect(CLAVE_LIBRE.startsWith("torre-diaria:")).toBe(true);
  });

  it.each(["{no es json", "null", "[]", JSON.stringify({ record: -3, tutorialVisto: "sí" }), JSON.stringify({ record: 1.5 })])(
    "con datos corruptos empieza de cero sin error: %s",
    (texto) => {
      const almacen = almacenEnMemoria();
      almacen.datos.set(CLAVE_LIBRE, texto);
      expect(leerRegistroLibre(almacen)).toEqual({ record: 0, tutorialVisto: false });
    },
  );

  it("un almacenamiento que lanza error no propaga la excepción (G10)", () => {
    const roto: Almacen = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(leerRegistroLibre(roto)).toEqual({ record: 0, tutorialVisto: false });
    expect(guardarRegistroLibre(roto, { record: 10, tutorialVisto: true })).toBe(false);
    expect(guardarRegistroLibre(null, { record: 10, tutorialVisto: true })).toBe(false);
  });
});
