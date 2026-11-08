import { describe, expect, it } from "vitest";
import { aTramos, CLAVE_PROGRESO, deTramos, escribirProgreso, Guardado, leerProgreso, progresoVacio, type Progreso } from "./progreso.ts";
import { CLAVE, CLAVE_LIBRE, type Almacen } from "./registro.ts";

function almacenEnMemoria(): Almacen & { datos: Map<string, string>; escritas: string[] } {
  const datos = new Map<string, string>();
  const escritas: string[] = [];
  return {
    datos,
    escritas,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => {
      escritas.push(clave);
      datos.set(clave, valor);
    },
  };
}

const roto: Almacen = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

function lleno(): Progreso {
  const p = progresoVacio();
  p.monedas = 1234;
  p.catalogo = { comprados: ["madera", "caramelo"], equipado: { tema: "madera", escenario: "ciudad" } };
  p.libre = { record: 2310, alturaRecord: 27.125, partidas: 14 };
  p.diarios = {
    3: { puntos: 1240, piezas: 41, altura: 18.4, perfectos: 12, colocadas: "0-11,13-40", enSuDia: true, reglas: 2 },
    5: { puntos: 0, piezas: 7, altura: 3.1, perfectos: 0, colocadas: "", enSuDia: true, reglas: 1 },
  };
  p.racha = { actual: 2, mejor: 5, ultimoDia: 5, congeladores: 1 };
  p.niveles = { 1: 3, 2: 1 };
  p.ajustes = { sonido: false, vibracion: true, tutorialVisto: true };
  p.estadisticas = { piezas: 500, perfectos: 120, comboMax: 9, alturaMax: 27.125 };
  p.ultimaCobrada = "libre-abc";
  return p;
}

describe("tramos de índices (impacto, C1)", () => {
  it("convierte índices en tramos y vuelve", () => {
    const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 40];
    expect(aTramos(indices)).toBe("0-11,13-15,40");
    expect(deTramos("0-11,13-15,40")).toEqual(indices);
    expect(aTramos([])).toBe("");
    expect(deTramos("")).toEqual([]);
  });

  it.each(["a", "1-", "-1", "3-1", "5,2", "1,,2", "1-2-3", "1 ,2", "99999"])("rechaza %j", (texto) => {
    expect(deTramos(texto)).toBeNull();
  });
});

describe("guardado v2 (C1)", () => {
  it("guardar y leer devuelve los mismos datos", () => {
    const almacen = almacenEnMemoria();
    expect(escribirProgreso(almacen, lleno())).toBe(true);
    expect(leerProgreso(almacen)).toEqual(lleno());
  });

  it("sin nada guardado da el progreso vacío", () => {
    expect(leerProgreso(almacenEnMemoria())).toEqual(progresoVacio());
  });

  it("con solo la clave v1 del día 3, el día queda jugado con reglas 1, sin puntos ni racha, y la clave v1 sigue", () => {
    const almacen = almacenEnMemoria();
    const v1 = JSON.stringify({ dia: 3, puntos: 7, altura: 4.2, formas: [{ forma: "bloque", color: 0 }] });
    almacen.datos.set(CLAVE, v1);
    const p = leerProgreso(almacen);
    expect(p.diarios[3]).toEqual({ puntos: 0, piezas: 7, altura: 4.2, perfectos: 0, colocadas: "", enSuDia: true, reglas: 1 });
    expect(p.monedas).toBe(0);
    expect(p.racha.actual).toBe(0);
    const guardado = new Guardado(almacen);
    guardado.cambiar((q) => ({ ...q, monedas: q.monedas + 5 }));
    expect(almacen.datos.get(CLAVE)).toBe(v1);
    expect(leerProgreso(almacen).diarios[3]?.reglas).toBe(1);
  });

  it("migra el récord libre y el aviso visto de torre-diaria:libre", () => {
    const almacen = almacenEnMemoria();
    almacen.datos.set(CLAVE_LIBRE, JSON.stringify({ record: 540, tutorialVisto: true }));
    const p = leerProgreso(almacen);
    expect(p.libre.record).toBe(540);
    expect(p.ajustes.tutorialVisto).toBe(true);
  });

  it.each([
    "{no es json",
    "null",
    "[]",
    "42",
    JSON.stringify({ version: 1, monedas: 5 }),
    JSON.stringify({ version: "2", monedas: 5 }),
    JSON.stringify({ version: 2, monedas: -5, libre: "x", racha: [], ajustes: null }),
    JSON.stringify({ version: 2, catalogo: { comprados: [1, "<b>", "madera"], equipado: { tema: 7 } } }),
    JSON.stringify({ version: 2, diarios: { "0": {}, abc: {}, "3": { puntos: "1" }, "4": { puntos: 1, piezas: 1, colocadas: "3-1", enSuDia: true, reglas: 2 } } }),
    JSON.stringify({ version: 99, monedas: 30, futuro: { algo: true } }),
  ])("con datos corruptos o desconocidos no hay excepción y el progreso es válido: %s", (texto) => {
    const almacen = almacenEnMemoria();
    almacen.datos.set(CLAVE_PROGRESO, texto);
    const p = leerProgreso(almacen);
    expect(p.version).toBe(2);
    expect(p.monedas).toBeGreaterThanOrEqual(0);
    expect(Object.keys(p.diarios)).toEqual([]);
    expect(p.catalogo.comprados.every((id) => /^[a-z]+$/.test(id))).toBe(true);
    // La clave no se toca hasta el primer guardado.
    expect(almacen.datos.get(CLAVE_PROGRESO)).toBe(texto);
  });

  it("de una versión mayor conserva lo legible", () => {
    const almacen = almacenEnMemoria();
    almacen.datos.set(CLAVE_PROGRESO, JSON.stringify({ version: 99, monedas: 30, futuro: true }));
    expect(leerProgreso(almacen).monedas).toBe(30);
  });

  it("con un almacén que lanza al leer y al escribir, funciona en memoria y guardar devuelve false (G10)", () => {
    const guardado = new Guardado(roto);
    expect(guardado.actual).toEqual(progresoVacio());
    expect(guardado.cambiar((p) => ({ ...p, monedas: p.monedas + 50 }))).toBe(false);
    expect(guardado.cambiar((p) => ({ ...p, monedas: p.monedas + 30 }))).toBe(false);
    expect(guardado.actual.monedas).toBe(80);
    expect(new Guardado(null).cambiar((p) => p)).toBe(false);
  });

  it("solo escribe la clave torre-diaria:progreso", () => {
    const almacen = almacenEnMemoria();
    almacen.datos.set(CLAVE, JSON.stringify({ dia: 3, puntos: 7, altura: 4.2, formas: [] }));
    almacen.datos.set(CLAVE_LIBRE, JSON.stringify({ record: 540, tutorialVisto: true }));
    const guardado = new Guardado(almacen);
    guardado.cambiar((p) => ({ ...p, monedas: 10 }));
    guardado.cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, sonido: false } }));
    expect(new Set(almacen.escritas)).toEqual(new Set([CLAVE_PROGRESO]));
    expect(CLAVE_PROGRESO.startsWith("torre-diaria:")).toBe(true);
    expect(almacen.escritas).toHaveLength(2);
  });

  it("con dos pestañas que ganan 50 y 30 monedas, quedan +80", () => {
    const almacen = almacenEnMemoria();
    escribirProgreso(almacen, { ...progresoVacio(), monedas: 100 });
    const una = new Guardado(almacen);
    const otra = new Guardado(almacen);
    una.cambiar((p) => ({ ...p, monedas: p.monedas + 50 }));
    otra.cambiar((p) => ({ ...p, monedas: p.monedas + 30 }));
    expect(leerProgreso(almacen).monedas).toBe(180);
    expect(una.releer().monedas).toBe(180);
  });

  it("365 días de diarios ocupan 100 KB o menos", () => {
    const p = progresoVacio();
    for (let dia = 1; dia <= 365; dia++) {
      // Una partida larga de experto: 180 piezas con dos caídas por medio.
      const indices = [...Array.from({ length: 60 }, (_, i) => i), ...Array.from({ length: 60 }, (_, i) => i + 62), ...Array.from({ length: 60 }, (_, i) => i + 125)];
      p.diarios[dia] = { puntos: 12_345, piezas: 180, altura: 47.123, perfectos: 126, colocadas: aTramos(indices), enSuDia: dia % 3 !== 0, reglas: 2 };
    }
    const almacen = almacenEnMemoria();
    escribirProgreso(almacen, p);
    const bytes = new TextEncoder().encode(almacen.datos.get(CLAVE_PROGRESO)!).length;
    expect(bytes).toBeLessThanOrEqual(100 * 1024);
    expect(Object.keys(leerProgreso(almacen).diarios)).toHaveLength(365);
  });
});
