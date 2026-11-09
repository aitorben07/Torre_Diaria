import { describe, expect, it } from "vitest";
import { cobrarLibre, hitosDeAltura, monedasDePartida, premioDiario, premioNivel, type PartidaAcabada } from "./economia.ts";
import { progresoVacio } from "./progreso.ts";

describe("monedas (C2, Anexo 1, 4.2)", () => {
  it.each([
    ["novato", 35, 4, 3, 54],
    ["medio", 70, 25, 6, 125],
    ["experto", 180, 126, 16, 386],
  ] as const)("la partida tipo del %s da las monedas escritas", (_, piezas, perfectos, hitos, monedas) => {
    expect(monedasDePartida({ piezas, perfectos, hitos })).toBe(monedas);
  });

  it("los hitos son uno por cada 5 m de altura máxima", () => {
    expect(hitosDeAltura(4.99)).toBe(0);
    expect(hitosDeAltura(5)).toBe(1);
    expect(hitosDeAltura(31.2)).toBe(6);
  });

  it("el reto diario da 15, 30, 60 o 100 más 10 por día de racha hasta 7", () => {
    expect(premioDiario(null, 0)).toBe(15);
    expect(premioDiario("bronce", 1)).toBe(40);
    expect(premioDiario("plata", 3)).toBe(90);
    expect(premioDiario("oro", 7)).toBe(170);
    expect(premioDiario("oro", 30)).toBe(170);
  });

  it("un nivel da 20 por estrella nueva y 200 por el mundo completo", () => {
    expect(premioNivel(2, false)).toBe(40);
    expect(premioNivel(1, true)).toBe(220);
  });
});

describe("cobrar la partida libre (C2)", () => {
  const partida: PartidaAcabada = { id: "libre-1#1", puntos: 610, piezas: 12, perfectos: 11, comboMax: 11, alturaMax: 8.6 };

  it("suma monedas, récord, altura récord, partidas y estadísticas", () => {
    const { progreso: p, monedas, nuevoRecord, nuevo } = cobrarLibre(progresoVacio(), partida);
    expect(p.monedas).toBe(12 + 11 + 5);
    expect(monedas).toBe(12 + 11 + 5);
    expect(nuevoRecord).toBe(true);
    expect(nuevo).toBe(true);
    expect(p.libre).toEqual({ record: 610, alturaRecord: 8.6, partidas: 1 });
    expect(p.estadisticas).toEqual({ piezas: 12, perfectos: 11, comboMax: 11, alturaMax: 8.6, partidas: 0 });
  });

  it("dos doradas colocadas suman 20 monedas a la partida libre (H2)", () => {
    const { progreso, monedas } = cobrarLibre(progresoVacio(), { ...partida, doradas: 2 });
    expect(monedas).toBe(12 + 11 + 5 + 20);
    expect(progreso.monedas).toBe(12 + 11 + 5 + 20);
    expect(monedasDePartida({ piezas: 1, perfectos: 0, hitos: 0, doradas: 1 })).toBe(11);
  });

  it("la misma partida no se cobra dos veces (dos pestañas): ni monedas ni récord", () => {
    const una = cobrarLibre(progresoVacio(), partida).progreso;
    const otra = cobrarLibre(una, partida);
    expect(otra).toEqual({ progreso: una, monedas: 0, nuevoRecord: false, nuevo: false });
    expect(otra.progreso).toBe(una);
  });

  it("repetir la misma semilla en otra partida sí se cobra, y el récord sale de lo guardado", () => {
    const una = cobrarLibre(progresoVacio(), partida).progreso;
    const otra = cobrarLibre(una, { ...partida, id: "libre-1#2", puntos: 700 });
    expect(otra.nuevo).toBe(true);
    expect(otra.monedas).toBe(12 + 11 + 5);
    expect(otra.nuevoRecord).toBe(true);
    expect(otra.progreso.monedas).toBe(2 * (12 + 11 + 5));
    expect(otra.progreso.libre).toEqual({ record: 700, alturaRecord: 8.6, partidas: 2 });
  });

  it("una partida peor no baja el récord ni cuenta como nuevo récord", () => {
    const una = cobrarLibre(progresoVacio(), partida).progreso;
    const otra = cobrarLibre(una, { ...partida, id: "libre-2#2", puntos: 100, alturaMax: 2 });
    expect(otra.nuevoRecord).toBe(false);
    expect(otra.progreso.libre.record).toBe(610);
    expect(otra.progreso.libre.alturaRecord).toBe(8.6);
    expect(otra.progreso.libre.partidas).toBe(2);
  });
});
