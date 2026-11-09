import { describe, expect, it } from "vitest";
import { PATRONES } from "./haptica.ts";
import { NOTAS_PERFECTO, notaPerfecto, VOLUMEN } from "./sonido.ts";

describe("nota del perfecto (A4)", () => {
  it("sube con el combo por la pentatónica de Do: 523, 587, 659, 784, 880 y 1047 Hz", () => {
    expect([1, 2, 3, 4, 5, 6].map(notaPerfecto)).toEqual([523, 587, 659, 784, 880, 1047]);
  });

  it("desde el combo 6 se queda en la más aguda y nunca baja de la primera", () => {
    expect(notaPerfecto(9)).toBe(1047);
    expect(notaPerfecto(0)).toBe(523);
    for (let combo = 1; combo < 10; combo++) expect(notaPerfecto(combo + 1)).toBeGreaterThanOrEqual(notaPerfecto(combo));
  });

  it("volumen general 0,5 y 6 notas", () => {
    expect(VOLUMEN).toBe(0.5);
    expect(NOTAS_PERFECTO).toHaveLength(6);
  });
});

describe("patrones de vibración (A4)", () => {
  it("son los del Anexo 1, 1.6", () => {
    expect(PATRONES).toEqual({ aterrizar: 8, perfecto: 15, vidaExtra: [15, 30, 15], caida: [30, 40, 30], record: 20, estrella: 20 });
  });
});
