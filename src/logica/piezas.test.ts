import { describe, expect, it } from "vitest";
import {
  ALTO_MAX,
  ALTO_MIN,
  ANCHO_MAX,
  ANCHO_MIN,
  FORMAS,
  FORMAS_INICIALES,
  generarSecuencia,
  PALETA,
  PIEZAS_INICIALES,
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
    // 135.000 comprobaciones: con varios archivos en paralelo pasa de los 5 s por defecto.
  }, 20_000);

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

  it("las primeras piezas solo son bloque, tablón o cuadrado en 50 semillas", () => {
    for (const semilla of semillas(50)) {
      for (const pieza of generarSecuencia(semilla, PIEZAS_INICIALES)) expect(FORMAS_INICIALES).toContain(pieza.forma);
    }
  });

  it("prueba dorada: las 5 primeras piezas de 2026-11-05 no cambian", () => {
    // Actualizada a propósito al suavizar el inicio (D6, F1 de pruebas.md):
    // velocidad desde 1,2 m/s y primeras piezas solo de formas estables.
    expect(generarSecuencia("2026-11-05", 5)).toEqual([
      { forma: "bloque", ancho: 0.91, alto: 0.77, color: 5, velocidad: 1.2 },
      { forma: "cuadrado", ancho: 0.74, alto: 0.74, color: 5, velocidad: 1.25 },
      { forma: "tablon", ancho: 1.97, alto: 0.32, color: 6, velocidad: 1.3 },
      { forma: "cuadrado", ancho: 0.76, alto: 0.76, color: 5, velocidad: 1.35 },
      { forma: "bloque", ancho: 0.96, alto: 0.61, color: 3, velocidad: 1.4 },
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
