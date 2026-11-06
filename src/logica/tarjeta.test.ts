import { describe, expect, it } from "vitest";
import { PALETA } from "./piezas.ts";
import { generarTarjeta, type DatosTarjeta } from "./tarjeta.ts";

const ORIGEN = "https://torre-diaria.pages.dev";

function datos(cambios: Partial<DatosTarjeta> = {}): DatosTarjeta {
  return {
    modo: "diario",
    dia: 12,
    puntos: 3,
    altura: 3.42,
    formas: [{ color: 0 }, { color: 4 }, { color: 2 }],
    origen: ORIGEN,
    ...cambios,
  };
}

function piezas(n: number): Array<{ color: number }> {
  return Array.from({ length: n }, (_, i) => ({ color: i % PALETA.length }));
}

describe("generarTarjeta", () => {
  it("la del reto diario lleva día, puntos, altura con coma y enlace de reto", () => {
    const texto = generarTarjeta(datos());
    expect(texto).toBe(
      ["Torre Diaria #12 🏗️", "🟥🟦🟨", "3 puntos · 3,4 m", `¿Me superas? ${ORIGEN}/?reto=12.3`].join("\n"),
    );
  });

  it("la de partida libre no lleva número de día ni reto", () => {
    const texto = generarTarjeta(datos({ modo: "libre" }));
    expect(texto).toContain("Partida libre");
    expect(texto).not.toContain("Práctica");
    expect(texto).not.toMatch(/#\d/);
    expect(texto).not.toContain("reto=");
    expect(texto).toContain(`${ORIGEN}/`);
  });

  it("con 0 puntos no deja una fila vacía ni NaN", () => {
    const texto = generarTarjeta(datos({ puntos: 0, altura: 0, formas: [] }));
    expect(texto).not.toContain("NaN");
    expect(texto).not.toContain("\n\n");
    expect(texto.split("\n").every((linea) => linea.trim().length > 0)).toBe(true);
    expect(texto).toContain("0 puntos · 0,0 m");
  });

  it("con 100 piezas muestra 24 emojis y +76", () => {
    const fila = generarTarjeta(datos({ puntos: 100, formas: piezas(100) })).split("\n")[1]!;
    const emojis = [...fila.replace(/ \+\d+$/, "")];
    expect(emojis).toHaveLength(24);
    expect(fila.endsWith(" +76")).toBe(true);
  });

  it("ninguna tarjeta con hasta 999 puntos supera 280 caracteres", () => {
    for (const puntos of [0, 1, 24, 25, 100, 999]) {
      for (const modo of ["diario", "libre"] as const) {
        const texto = generarTarjeta(datos({ modo, dia: 99_999, puntos, altura: 999.9, formas: piezas(puntos) }));
        // En UTF-16 cada emoji cuadrado ocupa 2 unidades.
        expect(texto.length).toBeLessThanOrEqual(280);
      }
    }
  });

  it("mismos datos, mismo texto", () => {
    expect(generarTarjeta(datos())).toBe(generarTarjeta(datos()));
  });

  it("cada emoji de la fila es el de la paleta para el color de esa pieza", () => {
    const formas = piezas(PALETA.length);
    const fila = generarTarjeta(datos({ puntos: formas.length, formas })).split("\n")[1]!;
    expect([...fila]).toEqual(formas.map(({ color }) => PALETA[color]!.emoji));
  });
});
