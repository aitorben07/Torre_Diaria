import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { crearGenerador, DIA_1, fechaDeDia, fechaUTC, numeroDia, semillaPractica } from "./semilla.ts";

function extraer(semilla: string, n: number): number[] {
  const azar = crearGenerador(semilla);
  return Array.from({ length: n }, () => azar());
}

describe("fechaUTC", () => {
  it("cambia de día a medianoche UTC", () => {
    const antes = fechaUTC(new Date("2026-11-05T23:59:59Z"));
    const despues = fechaUTC(new Date("2026-11-06T00:00:00Z"));
    expect(antes).toBe("2026-11-05");
    expect(despues).toBe("2026-11-06");
    expect(extraer(antes, 100)).not.toEqual(extraer(despues, 100));
  });

  it("no depende de la zona horaria del equipo", () => {
    expect(fechaUTC(new Date("2026-11-05T23:30:00-05:00"))).toBe("2026-11-06");
    expect(fechaUTC(new Date("2026-11-06T00:30:00+02:00"))).toBe("2026-11-05");
  });
});

describe("numeroDia", () => {
  it("cuenta desde DIA_1", () => {
    expect(DIA_1).toBe("2026-11-05");
    expect(numeroDia("2026-11-05")).toBe(1);
    expect(numeroDia("2026-12-05")).toBe(31);
  });

  it("fechaDeDia es su inversa", () => {
    for (const dia of [1, 2, 31, 365, 1000]) expect(numeroDia(fechaDeDia(dia))).toBe(dia);
    expect(fechaDeDia(31)).toBe("2026-12-05");
  });
});

describe("generador", () => {
  it("la misma fecha da la misma secuencia de 100 números", () => {
    expect(extraer("2026-11-05", 100)).toEqual(extraer("2026-11-05", 100));
  });

  it("prueba dorada: los 5 primeros números de 2026-11-05 no cambian", () => {
    expect(extraer("2026-11-05", 5)).toEqual([
      0.13912291824817657, 0.03529314580373466, 0.5714857473503798, 0.7415420094039291,
      0.8770933791529387,
    ]);
  });

  it("todos los valores están en [0, 1) en 10.000 extracciones", () => {
    for (const valor of extraer("2026-11-05", 10_000)) {
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });

  it("la semilla de práctica cambia en cada llamada", () => {
    expect(semillaPractica()).not.toBe(semillaPractica());
  });
});

describe("src/logica", () => {
  it("solo usa Math.random en semillaPractica", () => {
    const carpeta = new URL("./", import.meta.url);
    const usos = readdirSync(carpeta)
      .filter((archivo) => archivo.endsWith(".ts") && !archivo.endsWith(".test.ts"))
      .flatMap((archivo) =>
        readFileSync(new URL(archivo, carpeta), "utf8")
          .split("\n")
          .filter((linea) => linea.includes("Math.random") && !linea.trim().startsWith("//") && !linea.trim().startsWith("/**"))
          .map((linea) => `${archivo}: ${linea.trim()}`),
      );
    expect(usos).toEqual([
      "semilla.ts: return `practica-${Math.floor(Math.random() * 4_294_967_296).toString(36)}`;",
    ]);
  });
});
