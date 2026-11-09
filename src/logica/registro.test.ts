import { describe, expect, it } from "vitest";
import { CLAVE, CLAVE_LIBRE, leerRegistroLibre, leerResultadoV1, type Almacen, type ResultadoDia } from "./registro.ts";

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

const roto: Almacen = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("lector de la v1 (C1)", () => {
  it("lee el resultado que guardó la v1", () => {
    const almacen = almacenEnMemoria();
    almacen.datos.set(CLAVE, JSON.stringify(HOY));
    expect(leerResultadoV1(almacen)).toEqual(HOY);
  });

  it("lee el resultado de cualquier día, para migrarlo", () => {
    const almacen = almacenEnMemoria();
    almacen.datos.set(CLAVE, JSON.stringify({ ...HOY, dia: 6 }));
    expect(leerResultadoV1(almacen)?.dia).toBe(6);
  });

  it("un almacenamiento que lanza error no propaga la excepción", () => {
    expect(leerResultadoV1(roto)).toBeNull();
    expect(leerResultadoV1(null)).toBeNull();
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
    expect(leerResultadoV1(almacen)).toBeNull();
  });
});

describe("registro de la partida libre de B5, solo lectura (C1)", () => {
  it("lee el récord y el aviso visto de su clave", () => {
    const almacen = almacenEnMemoria();
    expect(leerRegistroLibre(almacen)).toEqual({ record: 0, tutorialVisto: false });
    almacen.datos.set(CLAVE_LIBRE, JSON.stringify({ record: 540, tutorialVisto: true }));
    expect(leerRegistroLibre(almacen)).toEqual({ record: 540, tutorialVisto: true });
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
    expect(leerRegistroLibre(roto)).toEqual({ record: 0, tutorialVisto: false });
    expect(leerRegistroLibre(null)).toEqual({ record: 0, tutorialVisto: false });
  });
});
