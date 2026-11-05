import { describe, expect, it } from "vitest";
import {
  ALTO_MAX,
  ALTO_MIN,
  ANCHO_MAX,
  ANCHO_MIN,
  FORMAS,
  generarSecuencia,
  PALETA,
  VEL_MAX,
  VEL_MIN,
} from "./piezas.ts";
import { fechaDeDia } from "./semilla.ts";

const semillas = (n: number) => Array.from({ length: n }, (_, i) => fechaDeDia(i + 1));

describe("generarSecuencia", () => {
  it("la misma semilla da una secuencia idéntica de 300 piezas", () => {
    const a = generarSecuencia("2026-11-05", 300);
    expect(a).toHaveLength(300);
    expect(generarSecuencia("2026-11-05", 300)).toEqual(a);
  });

  it("dos fechas consecutivas dan secuencias distintas", () => {
    expect(generarSecuencia("2026-11-05", 300)).not.toEqual(generarSecuencia("2026-11-06", 300));
  });

  it("medidas, velocidades y colores dentro de los límites en 50 semillas", () => {
    for (const semilla of semillas(50)) {
      for (const pieza of generarSecuencia(semilla, 300)) {
        expect(pieza.ancho).toBeGreaterThanOrEqual(ANCHO_MIN);
        expect(pieza.ancho).toBeLessThanOrEqual(ANCHO_MAX);
        expect(pieza.alto).toBeGreaterThanOrEqual(ALTO_MIN);
        expect(pieza.alto).toBeLessThanOrEqual(ALTO_MAX);
        expect(pieza.velocidad).toBeGreaterThanOrEqual(VEL_MIN);
        expect(pieza.velocidad).toBeLessThanOrEqual(VEL_MAX);
        expect(Number.isInteger(pieza.color)).toBe(true);
        expect(pieza.color).toBeGreaterThanOrEqual(0);
        expect(pieza.color).toBeLessThan(PALETA.length);
      }
    }
  });

  it("la velocidad nunca baja y no supera el tope", () => {
    const piezas = generarSecuencia("2026-11-05", 300);
    for (let i = 1; i < piezas.length; i++) {
      expect(piezas[i]!.velocidad).toBeGreaterThanOrEqual(piezas[i - 1]!.velocidad);
    }
    expect(piezas.at(-1)!.velocidad).toBe(VEL_MAX);
  });

  it("todas las formas salen en las 300 piezas de cada una de 10 semillas", () => {
    for (const semilla of semillas(10)) {
      const vistas = new Set(generarSecuencia(semilla, 300).map((pieza) => pieza.forma));
      expect([...vistas].sort()).toEqual([...FORMAS].sort());
    }
  });

  it("prueba dorada: las 5 primeras piezas de 2026-11-05 no cambian", () => {
    expect(generarSecuencia("2026-11-05", 5)).toEqual([
      { forma: "bloque", ancho: 0.91, alto: 0.77, color: 5, velocidad: 2 },
      { forma: "columna", ancho: 0.43, alto: 1.33, color: 2, velocidad: 2.08 },
      { forma: "triangulo", ancho: 1.23, alto: 0.9, color: 5, velocidad: 2.16 },
      { forma: "bloque", ancho: 1.22, alto: 0.68, color: 1, velocidad: 2.24 },
      { forma: "bloque", ancho: 1.09, alto: 0.69, color: 0, velocidad: 2.32 },
    ]);
  });
});

describe("PALETA", () => {
  it("cada color tiene un emoji cuadrado distinto y no hay más de 9", () => {
    const cuadrados = ["🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜"];
    expect(PALETA.length).toBeLessThanOrEqual(9);
    for (const color of PALETA) expect(cuadrados).toContain(color.emoji);
    expect(new Set(PALETA.map((color) => color.emoji)).size).toBe(PALETA.length);
  });
});
