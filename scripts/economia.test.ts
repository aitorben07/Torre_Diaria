import { describe, expect, it } from "vitest";
import { simular, type PartidaMuestra } from "./economia.ts";

// Partida sintética: 60 s, 20 piezas, 5 perfectos y 10,5 m (2 hitos) = 35 monedas, sin medalla.
const partida: PartidaMuestra = { segundos: 60, puntos: 300, piezas: 20, perfectos: 5, alturaMax: 10.5 };

describe("ritmo de la economía (C5)", () => {
  it("cuenta el reto diario con su premio y la racha, y las libres hasta gastar los minutos", () => {
    // Un día de 3 minutos: el reto (35 + 15 + 10 de racha) y dos libres (70) = 130.
    expect(simular([partida], 3, 1).monedasAlDia).toBe(130);
  });

  it("compra en cuanto llega al precio: Madera (300) con los minutos de juego que hagan falta", () => {
    const ritmo = simular([partida], 10, 45);
    // Día 1: 60 (reto) + 7 libres × 35 = 305 ≥ 300: la compra llega tras la 7.ª libre (8 min).
    expect(ritmo.primeraCompraMin).toBe(8);
    expect(ritmo.catalogoCompletoDia).not.toBeNull();
  });

  it("sin monedas suficientes no compra nada", () => {
    const corta: PartidaMuestra = { segundos: 600, puntos: 0, piezas: 0, perfectos: 0, alturaMax: 0 };
    // Solo los premios del reto en dos días: 25 + 35 = 60 monedas.
    expect(simular([corta], 10, 2)).toMatchObject({ primeraCompraMin: null, catalogoCompletoDia: null, monedasAlDia: 30 });
  });
});
