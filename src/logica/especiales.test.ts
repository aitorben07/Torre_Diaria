import { describe, expect, it } from "vitest";
import { DESDE_ESPECIAL, especialDe, ESPECIALES, PRIMERA_ESPECIAL, TRAMO_ESPECIAL, type Especial } from "./especiales.ts";
import { generarSecuencia } from "./piezas.ts";
import { fechaDeDia } from "./semilla.ts";

const semillas = (n: number) => Array.from({ length: n }, (_, i) => fechaDeDia(i + 1));
const especialesDe = (semilla: string, n: number) => Array.from({ length: n }, (_, i) => especialDe(semilla, i));

describe("especialDe (H1)", () => {
  it("la misma semilla da las mismas especiales se pidan en el orden que se pidan", () => {
    const semilla = "2026-11-20";
    const enOrden = especialesDe(semilla, 400);
    const alReves = Array.from({ length: 400 }, (_, i) => especialDe(semilla, 399 - i)).reverse();
    const saltando = [...enOrden.keys()].sort((a, b) => ((a * 37) % 400) - ((b * 37) % 400)).map((i) => [i, especialDe(semilla, i)] as const);
    expect(alReves).toEqual(enOrden);
    for (const [i, especial] of saltando) expect(especial).toBe(enOrden[i]);
    expect(especialesDe("2026-11-21", 400)).not.toEqual(enOrden);
  });

  it("exactamente una especial en cada tramo de 8 desde la pieza 8, y ninguna antes (50 semillas, 400 piezas)", () => {
    for (const semilla of semillas(50)) {
      const lista = especialesDe(semilla, 400);
      expect(lista.slice(0, PRIMERA_ESPECIAL).every((e) => e === null)).toBe(true);
      for (let inicio = PRIMERA_ESPECIAL; inicio < 400; inicio += TRAMO_ESPECIAL) {
        expect(lista.slice(inicio, inicio + TRAMO_ESPECIAL).filter((e) => e !== null)).toHaveLength(1);
      }
    }
  });

  it("el primer tramo siempre es dorada, no sale pegajosa antes de la 16 ni cemento antes de la 24, y salen las tres", () => {
    const vistas = new Set<Especial>();
    for (const semilla of semillas(50)) {
      especialesDe(semilla, 400).forEach((especial, i) => {
        if (!especial) return;
        vistas.add(especial);
        expect(i).toBeGreaterThanOrEqual(DESDE_ESPECIAL[especial]);
        if (i < 16) expect(especial).toBe("dorada");
      });
    }
    expect([...vistas].sort()).toEqual([...ESPECIALES].sort());
  });

  it("los tipos se reparten más o menos con los pesos 40, 30 y 30 desde el tercer tramo", () => {
    const cuenta: Record<Especial, number> = { dorada: 0, pegajosa: 0, cemento: 0 };
    for (const semilla of semillas(100)) {
      for (const especial of especialesDe(semilla, 400).slice(24)) if (especial) cuenta[especial]++;
    }
    const total = cuenta.dorada + cuenta.pegajosa + cuenta.cemento;
    expect(cuenta.dorada / total).toBeCloseTo(0.4, 1);
    expect(cuenta.pegajosa / total).toBeCloseTo(0.3, 1);
    expect(cuenta.cemento / total).toBeCloseTo(0.3, 1);
  });

  it("con especiales: false no sale ninguna", () => {
    for (const semilla of semillas(10)) {
      expect(Array.from({ length: 200 }, (_, i) => especialDe(semilla, i, { especiales: false })).every((e) => e === null)).toBe(true);
    }
  });

  it("pedir especiales no cambia la secuencia de formas", () => {
    const antes = generarSecuencia("2026-11-05", 120);
    especialesDe("2026-11-05", 120);
    expect(generarSecuencia("2026-11-05", 120)).toEqual(antes);
  });
});
