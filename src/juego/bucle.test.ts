import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { consumirTiempo, MAX_PASOS_POR_FOTOGRAMA, PASO_MS } from "./bucle.ts";

describe("consumirTiempo", () => {
  it("con un salto de 10 s no ejecuta más de 5 pasos y descarta el resto", () => {
    expect(MAX_PASOS_POR_FOTOGRAMA).toBe(5);
    expect(consumirTiempo(0, 10_000)).toEqual({ pasos: 5, acumulado: 0 });
  });

  it("a 60 Hz da un paso por fotograma y guarda el resto", () => {
    const { pasos, acumulado } = consumirTiempo(0, PASO_MS * 1.5);
    expect(pasos).toBe(1);
    expect(acumulado).toBeCloseTo(PASO_MS / 2, 9);
  });

  it("a 120 Hz da un paso cada dos fotogramas", () => {
    let acumulado = 0;
    let total = 0;
    for (let i = 0; i < 120; i++) {
      const r = consumirTiempo(acumulado, 1000 / 120);
      acumulado = r.acumulado;
      total += r.pasos;
    }
    expect(total).toBeGreaterThanOrEqual(59);
    expect(total).toBeLessThanOrEqual(60);
  });

  it("ignora tiempos negativos", () => {
    expect(consumirTiempo(0, -50)).toEqual({ pasos: 0, acumulado: 0 });
  });
});

describe("src/juego", () => {
  it("ningún archivo importa planck", () => {
    const carpeta = new URL("./", import.meta.url);
    const conPlanck = readdirSync(carpeta).filter((archivo) =>
      /from\s+["']planck["']/.test(readFileSync(new URL(archivo, carpeta), "utf8")),
    );
    expect(conPlanck).toEqual([]);
  });
});
