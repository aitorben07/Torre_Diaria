import { describe, expect, it } from "vitest";
import { aTramos, CLAVE_PROGRESO, deTramos, escribirProgreso, Guardado, leerProgreso, MAX_OBJETO, MAX_TRANSACCIONES, normalizar, progresoVacio, VERSION_PROGRESO, type Progreso } from "./progreso.ts";
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
  p.ajustes = { sonido: false, vibracion: true, tutorialVisto: true, musica: false };
  p.estadisticas = { piezas: 500, perfectos: 120, comboMax: 9, alturaMax: 27.125, partidas: 18 };
  p.ultimaCobrada = "libre-abc";
  p.objetos = { reloj: 3, cemento: 9, corazon: 0, desbloqueados: ["reloj", "cemento"] };
  p.recompensas = { ultimoVideoMonedas: 1_794_000_000_000, diaObjetoVideo: 16, objetosVideo: 1 };
  p.compras = { transacciones: [{ id: "tx-1", producto: "monedas-1000", monedas: 1000, fecha: 1_794_000_000_000 }] };
  p.vistos = ["dorada"];
  return p;
}

/**
 * Un progreso v2 completo tal como lo guardaba la segunda versión (fijado:
 * no sale de `progresoVacio`, que ya es v3).
 */
const V2 = {
  version: 2,
  monedas: 1234,
  catalogo: { comprados: ["madera", "caramelo"], equipado: { tema: "madera", escenario: "ciudad" } },
  libre: { record: 2310, alturaRecord: 27.125, partidas: 14 },
  diarios: {
    3: { puntos: 1240, piezas: 41, altura: 18.4, perfectos: 12, colocadas: "0-11,13-40", enSuDia: true, reglas: 2 },
    5: { puntos: 0, piezas: 7, altura: 3.1, perfectos: 0, colocadas: "", enSuDia: true, reglas: 1 },
  },
  racha: { actual: 2, mejor: 5, ultimoDia: 5, congeladores: 1 },
  niveles: { 1: 3, 2: 1, 3: 0 },
  ajustes: { sonido: false, vibracion: true, tutorialVisto: true },
  estadisticas: { piezas: 500, perfectos: 120, comboMax: 9, alturaMax: 27.125 },
  ultimaCobrada: "libre-abc",
};

/**
 * Claves y tipos de `progresoVacio()` en la v2, fijados aquí (Decisión T31):
 * la v2 lee cada una con su tipo, así que si siguen igual en la v3, la v2
 * puede leer un guardado v3. `objeto` = objeto sin array.
 */
const CLAVES_V2: Record<string, string> = {
  version: "number",
  monedas: "number",
  catalogo: "objeto",
  "catalogo.comprados": "array",
  "catalogo.equipado": "objeto",
  "catalogo.equipado.tema": "string",
  "catalogo.equipado.escenario": "string",
  libre: "objeto",
  "libre.record": "number",
  "libre.alturaRecord": "number",
  "libre.partidas": "number",
  diarios: "objeto",
  racha: "objeto",
  "racha.actual": "number",
  "racha.mejor": "number",
  "racha.ultimoDia": "number",
  "racha.congeladores": "number",
  niveles: "objeto",
  ajustes: "objeto",
  "ajustes.sonido": "boolean",
  "ajustes.vibracion": "boolean",
  "ajustes.tutorialVisto": "boolean",
  estadisticas: "objeto",
  "estadisticas.piezas": "number",
  "estadisticas.perfectos": "number",
  "estadisticas.comboMax": "number",
  "estadisticas.alturaMax": "number",
  ultimaCobrada: "string",
};

/** Tipo de `ruta` («a.b») dentro de `valor`, con la misma notación que `CLAVES_V2`. */
function tipoEn(valor: unknown, ruta: string): string {
  let actual: unknown = valor;
  for (const parte of ruta.split(".")) actual = (actual as Record<string, unknown> | undefined)?.[parte];
  if (Array.isArray(actual)) return "array";
  if (actual === null) return "null";
  return typeof actual === "object" ? "objeto" : typeof actual;
}

function leerTexto(texto: string): Progreso {
  const almacen = almacenEnMemoria();
  almacen.datos.set(CLAVE_PROGRESO, texto);
  return leerProgreso(almacen);
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
    expect(p.version).toBe(VERSION_PROGRESO);
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

  it("365 días de experto, el inventario lleno y 50 compras ocupan 100 KB o menos (v3)", () => {
    const p = progresoVacio();
    for (let dia = 1; dia <= 365; dia++) {
      // Una partida larga de experto: 180 piezas con dos caídas por medio.
      const indices = [...Array.from({ length: 60 }, (_, i) => i), ...Array.from({ length: 60 }, (_, i) => i + 62), ...Array.from({ length: 60 }, (_, i) => i + 125)];
      p.diarios[dia] = { puntos: 12_345, piezas: 180, altura: 47.123, perfectos: 126, colocadas: aTramos(indices), enSuDia: dia % 3 !== 0, reglas: 3 };
    }
    p.objetos = { reloj: MAX_OBJETO, cemento: MAX_OBJETO, corazon: MAX_OBJETO, desbloqueados: ["reloj", "cemento", "corazon"] };
    p.recompensas = { ultimoVideoMonedas: 1_794_000_000_000, diaObjetoVideo: 365, objetosVideo: 1 };
    p.compras.transacciones = Array.from({ length: MAX_TRANSACCIONES }, (_, i) => ({
      id: `pi_3Q${String(i).padStart(4, "0")}abcdefghijklmnopqrstuv`,
      producto: "monedas-8000",
      monedas: 8000,
      fecha: 1_794_000_000_000 + i,
    }));
    p.vistos = ["dorada", "pegajosa", "cemento"];
    p.estadisticas.partidas = 9999;
    const almacen = almacenEnMemoria();
    escribirProgreso(almacen, p);
    const bytes = new TextEncoder().encode(almacen.datos.get(CLAVE_PROGRESO)!).length;
    expect(bytes).toBeLessThanOrEqual(100 * 1024);
    const leido = leerProgreso(almacen);
    expect(Object.keys(leido.diarios)).toHaveLength(365);
    expect(leido.compras.transacciones).toHaveLength(MAX_TRANSACCIONES);
  });
});

describe("guardado v3 con migración aditiva (C1, tercera versión)", () => {
  it("un progreso v2 completo se lee como v3 con los mismos valores de la v2 y los nuevos por defecto", () => {
    const p = leerTexto(JSON.stringify(V2));
    expect(p.version).toBe(3);
    const { objetos, recompensas, compras, vistos, ...resto } = p;
    expect(resto).toEqual({
      ...V2,
      version: 3,
      niveles: { 1: 3, 2: 1, 3: 0 },
      ajustes: { ...V2.ajustes, musica: false },
      // 14 libres + 2 días + 2 niveles con estrellas (el 3, con 0, no cuenta).
      estadisticas: { ...V2.estadisticas, partidas: 18 },
    });
    expect({ objetos, recompensas, compras, vistos }).toEqual({
      objetos: progresoVacio().objetos,
      recompensas: progresoVacio().recompensas,
      compras: progresoVacio().compras,
      vistos: [],
    });
  });

  it("guardar y leer un v3 lleno devuelve lo mismo", () => {
    const almacen = almacenEnMemoria();
    escribirProgreso(almacen, lleno());
    expect(leerProgreso(almacen)).toEqual(lleno());
    expect(JSON.parse(almacen.datos.get(CLAVE_PROGRESO)!).version).toBe(3);
  });

  it.each([true, false])("con ajustes.sonido %s en la v2, la música queda igual", (sonido) => {
    const p = leerTexto(JSON.stringify({ ...V2, ajustes: { ...V2.ajustes, sonido } }));
    expect(p.ajustes.musica).toBe(sonido);
    expect(p.ajustes.sonido).toBe(sonido);
  });

  it("en la v3 la música se guarda aparte del sonido", () => {
    const p = leerTexto(JSON.stringify({ ...V2, version: 3, ajustes: { ...V2.ajustes, sonido: false, musica: true } }));
    expect(p.ajustes).toMatchObject({ sonido: false, musica: true });
  });

  it("estadisticas.partidas migrado = partidas libres + días jugados + niveles con estrellas", () => {
    expect(leerTexto(JSON.stringify(V2)).estadisticas.partidas).toBe(14 + 2 + 2);
    expect(leerTexto(JSON.stringify({ version: 2 })).estadisticas.partidas).toBe(0);
    // En la v3 manda el valor guardado.
    expect(leerTexto(JSON.stringify({ ...V2, version: 3, estadisticas: { ...V2.estadisticas, partidas: 40 } })).estadisticas.partidas).toBe(40);
  });

  it("todas las claves y tipos de la v2 siguen en la v3 con el mismo tipo", () => {
    for (const [ruta, tipo] of Object.entries(CLAVES_V2)) {
      expect(tipoEn(progresoVacio(), ruta), ruta).toBe(tipo);
      expect(tipoEn(lleno(), ruta), ruta).toBe(tipo);
    }
  });

  it("lo que lee la v2 de un guardado v3 (sus claves) conserva monedas, diarios, racha, niveles y catálogo", () => {
    // La v2 lee solo las claves de CLAVES_V2 con su tipo y acepta version ≥ 2.
    const guardado = JSON.parse(JSON.stringify(lleno())) as Record<string, unknown>;
    expect(guardado.version).toBeGreaterThanOrEqual(2);
    const v2 = Object.fromEntries(Object.keys(CLAVES_V2).filter((r) => !r.includes(".")).map((clave) => [clave, guardado[clave]]));
    const original = lleno();
    expect(v2).toMatchObject({
      monedas: original.monedas,
      diarios: JSON.parse(JSON.stringify(original.diarios)),
      racha: original.racha,
      niveles: JSON.parse(JSON.stringify(original.niveles)),
      catalogo: original.catalogo,
    });
  });

  it.each([
    ["objetos negativos o de más de 9", { objetos: { reloj: -3, cemento: 40, corazon: 2.5, desbloqueados: ["reloj", "bomba", "reloj", 7] } }],
    ["objetos de tipo erróneo", { objetos: "muchos" }],
    ["vídeo con fecha imposible", { recompensas: { ultimoVideoMonedas: 1e20, diaObjetoVideo: 5_000_000, objetosVideo: 99 } }],
    ["vídeo con fecha futura", { recompensas: { ultimoVideoMonedas: 4_000_000_000_000, diaObjetoVideo: 99_999, objetosVideo: 1 } }],
    ["vídeo con tipos erróneos", { recompensas: { ultimoVideoMonedas: "ayer", diaObjetoVideo: null, objetosVideo: -1 } }],
    ["más de 50 transacciones", { compras: { transacciones: Array.from({ length: 80 }, (_, i) => ({ id: `t${i}`, producto: "monedas-1000", monedas: 1000, fecha: i })) } }],
    ["transacciones repetidas o raras", { compras: { transacciones: [{ id: "t1", producto: "monedas-1000", monedas: 1000, fecha: 1 }, { id: "t1", producto: "monedas-1000", monedas: 1000, fecha: 2 }, { id: "<img>", producto: "x", monedas: 1, fecha: 1 }, { id: "t2", producto: "monedas-1000", monedas: -5, fecha: 1 }, "t3", null] } }],
    ["compras de tipo erróneo", { compras: { transacciones: "t1", loteInicio: true } }],
    ["vistos raros", { vistos: ["dorada", "dorada", "<b>", 3, ...Array.from({ length: 40 }, (_, i) => `tipo-${i}`)] }],
    ["vistos de tipo erróneo", { vistos: { dorada: true } }],
    ["versión 99", { version: 99 }],
    ["música y partidas de tipo erróneo", { ajustes: { sonido: true, musica: "sí" }, estadisticas: { partidas: -4 } }],
  ])("con %s no hay excepción y el progreso es válido y acotado", (_caso, raro) => {
    const p = leerTexto(JSON.stringify({ ...V2, version: 3, ...raro }));
    expect(p.version).toBe(VERSION_PROGRESO);
    expect(p.monedas).toBe(V2.monedas);
    for (const objeto of ["reloj", "cemento", "corazon"] as const) {
      expect(Number.isInteger(p.objetos[objeto])).toBe(true);
      expect(p.objetos[objeto]).toBeGreaterThanOrEqual(0);
      expect(p.objetos[objeto]).toBeLessThanOrEqual(MAX_OBJETO);
    }
    expect(new Set(p.objetos.desbloqueados).size).toBe(p.objetos.desbloqueados.length);
    expect(p.objetos.desbloqueados.every((o) => ["reloj", "cemento", "corazon"].includes(o))).toBe(true);
    expect(p.recompensas.ultimoVideoMonedas).toBeLessThanOrEqual(4_102_444_800_000);
    expect(p.recompensas.objetosVideo).toBeLessThanOrEqual(MAX_OBJETO);
    expect(p.compras.transacciones.length).toBeLessThanOrEqual(MAX_TRANSACCIONES);
    expect(new Set(p.compras.transacciones.map((t) => t.id)).size).toBe(p.compras.transacciones.length);
    expect(p.compras.transacciones.every((t) => t.monedas >= 0 && /^[a-z0-9-]+$/.test(t.producto))).toBe(true);
    expect(p.vistos.length).toBeLessThanOrEqual(16);
    expect(p.vistos.every((v) => /^[a-z0-9-]+$/.test(v))).toBe(true);
    expect(typeof p.ajustes.musica).toBe("boolean");
    expect(p.estadisticas.partidas).toBeGreaterThanOrEqual(0);
  });

  it("con más de 50 transacciones se quedan las 50 más recientes", () => {
    const transacciones = Array.from({ length: 80 }, (_, i) => ({ id: `t${i}`, producto: "monedas-1000", monedas: 1000, fecha: i }));
    const p = normalizar({ ...V2, version: 3, compras: { transacciones } })!;
    expect(p.compras.transacciones.map((t) => t.id)).toEqual(transacciones.slice(30).map((t) => t.id));
  });

  it("con un almacén que lanza, los campos v3 cambian en memoria (R10)", () => {
    const guardado = new Guardado(roto);
    expect(guardado.cambiar((p) => ({ ...p, objetos: { ...p.objetos, reloj: 2 }, vistos: ["dorada"] }))).toBe(false);
    expect(guardado.actual.objetos.reloj).toBe(2);
    expect(guardado.actual.vistos).toEqual(["dorada"]);
    expect(guardado.actual.ajustes.musica).toBe(true);
  });
});
