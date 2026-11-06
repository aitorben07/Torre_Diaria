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
  PIEZAS_POR_TRAMO,
  PROB_DIFICIL_INICIAL,
  PROB_DIFICIL_TOPE,
  probabilidadDificil,
  Secuencia,
  VEL_MIN,
  VEL_TOPE,
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
        expect(pieza.velocidad).toBeLessThanOrEqual(VEL_TOPE);
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
    expect(piezas.at(-1)!.velocidad).toBe(VEL_TOPE);
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
    // Actualizada a propósito con REGLAS = 2 (segunda-version, B3/B4): mismas
    // formas, medidas y colores que en la v1; la velocidad empieza en 1,0 m/s
    // y sube 0,03 por pieza (antes 1,2 y 0,05).
    expect(generarSecuencia("2026-11-05", 5)).toEqual([
      { forma: "bloque", ancho: 0.91, alto: 0.77, color: 5, velocidad: 1 },
      { forma: "cuadrado", ancho: 0.74, alto: 0.74, color: 5, velocidad: 1.03 },
      { forma: "tablon", ancho: 1.97, alto: 0.32, color: 6, velocidad: 1.06 },
      { forma: "cuadrado", ancho: 0.76, alto: 0.76, color: 5, velocidad: 1.09 },
      { forma: "bloque", ancho: 0.96, alto: 0.61, color: 3, velocidad: 1.12 },
    ]);
  });

  it("prueba dorada: las piezas 100 a 104 de 2026-11-05 no cambian (B3)", () => {
    expect(generarSecuencia("2026-11-05", 105).slice(100)).toEqual([
      { forma: "columna", ancho: 0.45, alto: 1.14, color: 0, velocidad: 3.4 },
      { forma: "cuadrado", ancho: 0.71, alto: 0.71, color: 6, velocidad: 3.4 },
      { forma: "columna", ancho: 0.53, alto: 1.01, color: 1, velocidad: 3.4 },
      { forma: "cuadrado", ancho: 0.83, alto: 0.83, color: 2, velocidad: 3.4 },
      { forma: "bloque", ancho: 1.17, alto: 0.63, color: 6, velocidad: 3.4 },
    ]);
  });

  it("generarSecuencia(s, n) y generarSecuencia(s, m) coinciden en las min(n, m) primeras", () => {
    for (const semilla of semillas(5)) {
      const larga = generarSecuencia(semilla, 700);
      expect(generarSecuencia(semilla, 37)).toEqual(larga.slice(0, 37));
      expect(generarSecuencia(semilla, 600)).toEqual(larga.slice(0, 600));
      // La secuencia bajo demanda da lo mismo aunque se pida salteada.
      const secuencia = new Secuencia(semilla);
      expect(secuencia.pieza(650)).toEqual(larga[650]);
      expect(secuencia.pieza(3)).toEqual(larga[3]);
    }
  });
});

describe("curva de dificultad (B3)", () => {
  it("la velocidad no baja de una pieza a la siguiente en 700 piezas y llega a VEL_TOPE", () => {
    const piezas = generarSecuencia("2026-11-06", 700);
    expect(piezas[0]!.velocidad).toBe(VEL_MIN);
    for (let i = 1; i < piezas.length; i++) expect(piezas[i]!.velocidad).toBeGreaterThanOrEqual(piezas[i - 1]!.velocidad);
    expect(Math.max(...piezas.map((p) => p.velocidad))).toBe(VEL_TOPE);
  });

  it("triángulo y columna salen con probabilidad que sube por tramos de 10 hasta el tope", () => {
    expect(probabilidadDificil(PIEZAS_INICIALES - 1)).toBe(0);
    expect(probabilidadDificil(PIEZAS_INICIALES)).toBe(PROB_DIFICIL_INICIAL);
    const porTramo = Array.from({ length: 12 }, (_, tramo) => probabilidadDificil(Math.max(PIEZAS_INICIALES, tramo * PIEZAS_POR_TRAMO)));
    for (let i = 1; i < porTramo.length; i++) expect(porTramo[i]!).toBeGreaterThanOrEqual(porTramo[i - 1]!);
    expect(Math.max(...porTramo)).toBe(PROB_DIFICIL_TOPE);
    // En 200 semillas, las piezas 300 a 399 tienen unas 25 % de cada forma difícil.
    let dificiles = 0;
    let total = 0;
    for (const semilla of semillas(200)) {
      for (const pieza of generarSecuencia(semilla, 400).slice(300)) {
        total++;
        if (pieza.forma === "triangulo") dificiles++;
      }
    }
    expect(dificiles / total).toBeGreaterThan(PROB_DIFICIL_TOPE - 0.02);
    expect(dificiles / total).toBeLessThan(PROB_DIFICIL_TOPE + 0.02);
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
