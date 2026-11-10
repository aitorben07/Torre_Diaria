import { describe, expect, it } from "vitest";
import { monedasMedianas, simular, type PartidaMuestra } from "./economia.ts";

// Partida sintética: 60 s, 20 piezas, 5 perfectos y 10,5 m (2 hitos) = 35 monedas, sin medalla.
const partida: PartidaMuestra = { segundos: 60, puntos: 300, piezas: 20, perfectos: 5, alturaMax: 10.5 };

describe("ritmo de la economía (C5)", () => {
  it("cuenta el reto diario con su premio y la racha, y las libres hasta gastar los minutos", () => {
    // Un día de 3 minutos: el reto (35 + 15 + 10 de racha) y dos libres (70) = 130.
    expect(simular([partida], 3, 1).monedasAlDia).toBe(130);
  });

  it("compra en cuanto llega al precio: Madera (450) con los minutos de juego que hagan falta", () => {
    const ritmo = simular([partida], 10, 45);
    // Día 1: 60 (reto) + 9 libres × 35 = 375 en 10 min. Día 2: reto (35 + 15 + 20 de racha) = 445
    // y una libre más = 480 ≥ 450: la compra llega a los 12 min.
    expect(ritmo.primeraCompraMin).toBe(12);
    expect(ritmo.catalogoCompletoDia).not.toBeNull();
  });

  it("sin monedas suficientes no compra nada", () => {
    const corta: PartidaMuestra = { segundos: 600, puntos: 0, piezas: 0, perfectos: 0, alturaMax: 0 };
    // Solo los premios del reto en dos días: 25 + 35 = 60 monedas.
    expect(simular([corta], 10, 2)).toMatchObject({ primeraCompraMin: null, catalogoCompletoDia: null, monedasAlDia: 30 });
  });

  it("L3: con monedas propias de la partida (las doradas incluidas) usa esas en lugar de calcularlas", () => {
    expect(simular([{ ...partida, monedas: 100 }], 3, 1).monedasAlDia).toBe(100 + 15 + 10 + 2 * 100);
    expect(monedasMedianas([partida, { ...partida, monedas: 50 }, { ...partida, monedas: 70 }])).toBe(50);
  });

  it("L3: con vídeos suma 60 por vídeo al día", () => {
    expect(simular([partida], 3, 1, { videosAlDia: 4 }).monedasAlDia).toBe(130 + 4 * 60);
  });

  it("L3: con objetos compra al día los del plan, el más barato que no esté al máximo y solo desbloqueado", () => {
    // Un día de 3 min = 3 partidas: con 2 se desbloquea el reloj (regalo de 2) y se compra 1 a 120.
    const uno = simular([partida], 3, 1, { objetosAlDia: 1 });
    expect(uno.objetosComprados).toBe(1);
    // Muchos días: como mucho hasta 9 de cada uno (27 menos los 6 regalados).
    expect(simular([partida], 10, 60, { objetosAlDia: 2 }).objetosComprados).toBe(21);
    // Los objetos retrasan los temas.
    expect(simular([partida], 10, 45, { objetosAlDia: 1 }).catalogoCompletoDia!).toBeGreaterThan(simular([partida], 10, 45).catalogoCompletoDia!);
  });
});
