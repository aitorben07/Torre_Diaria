import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { etiquetaModo, filaDatos, MAX_PIEZAS_IMAGEN } from "./imagen.ts";

describe("imagen para compartir (F1)", () => {
  it("la etiqueta dice el modo, con la fecha corta en el reto diario", () => {
    expect(etiquetaModo({ modo: "libre" })).toBe("PARTIDA LIBRE");
    expect(etiquetaModo({ modo: "diario", dia: 16 })).toBe("RETO #16 · 20 NOV");
    expect(etiquetaModo({ modo: "diario", dia: 2 })).toBe("RETO #2 · 6 NOV");
    expect(etiquetaModo({ modo: "nivel", nivel: 3 })).toBe("NIVEL 3");
  });

  it("la fila de datos lleva altura, perfectos, mejor combo y racha, los que haya", () => {
    expect(filaDatos({ altura: 18.42, perfectos: 6, comboMax: 5, racha: 5 })).toBe("18,4 m · 6 perfectos · combo ×5 · racha de 5");
    expect(filaDatos({ altura: 3, perfectos: 1, comboMax: 0 })).toBe("3,0 m · 1 perfecto");
    expect(filaDatos({ altura: 4.1, perfectos: null, comboMax: null, racha: 0 })).toBe("4,1 m");
  });

  it("dibuja 40 piezas como mucho; el resto se cuenta en «+N»", () => {
    expect(MAX_PIEZAS_IMAGEN).toBe(40);
    const codigo = readFileSync(new URL("./imagen.ts", import.meta.url), "utf8");
    expect(codigo).toContain("datos.formas.slice(0, MAX_PIEZAS_IMAGEN)");
    expect(codigo).toContain("`+${formatearNumero(resto)}`");
  });

  it("no escribe emojis ni iconos como caracteres (S18, G11) ni texto de la URL salvo el dominio", () => {
    const codigo = readFileSync(new URL("./imagen.ts", import.meta.url), "utf8");
    expect(codigo).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(codigo).not.toMatch(/[★☆♥→]/);
    expect(codigo).not.toMatch(/location\.(search|href|hash)/);
  });
});
