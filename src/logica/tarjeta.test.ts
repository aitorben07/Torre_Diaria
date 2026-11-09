import { describe, expect, it } from "vitest";
import { leerLibre, leerReto } from "./reto.ts";
import { formatearNumero, formatearPuntos, generarTarjeta, type DatosTarjeta } from "./tarjeta.ts";

const ORIGEN = "https://torre-diaria.pages.dev";

const diario = (cambios: Partial<Extract<DatosTarjeta, { modo: "diario" }>> = {}): DatosTarjeta => ({
  modo: "diario",
  dia: 16,
  puntos: 1240,
  altura: 18.42,
  racha: 5,
  origen: ORIGEN,
  ...cambios,
});
const libre = (cambios: Partial<Extract<DatosTarjeta, { modo: "libre" }>> = {}): DatosTarjeta => ({
  modo: "libre",
  codigo: "a1b2c3",
  puntos: 2310,
  altura: 27.1,
  origen: ORIGEN,
  ...cambios,
});
const nivel = (cambios: Partial<Extract<DatosTarjeta, { modo: "nivel" }>> = {}): DatosTarjeta => ({
  modo: "nivel",
  nivel: 12,
  estrellas: 3,
  victoria: true,
  origen: ORIGEN,
  ...cambios,
});

describe("generarTarjeta (F2)", () => {
  it("la del reto diario lleva día, puntos, altura, racha y el enlace de reto (Anexo 1, 7.2)", () => {
    expect(generarTarjeta(diario())).toBe(`Torre Diaria #16: 1.240 puntos, 18,4 m, racha de 5 días.\n¿Me superas? ${ORIGEN}/?reto=16.1240`);
    expect(generarTarjeta(diario({ racha: 1 }))).toContain("racha de 1 día.");
    // Sin racha (un día pasado) no se escribe.
    expect(generarTarjeta(diario({ racha: 0 })).split("\n")[0]).toBe("Torre Diaria #16: 1.240 puntos y 18,4 m.");
    expect(leerReto(generarTarjeta(diario()).split(" ").at(-1)!, 16)).toEqual({ dia: 16, puntos: 1240 });
  });

  it("un día de la v1 se cuenta en piezas y enlaza la página principal, sin ?reto= con piezas", () => {
    const texto = generarTarjeta(diario({ enPiezas: true, puntos: 12, racha: 0 }));
    expect(texto).toBe(`Torre Diaria #16: 12 piezas y 18,4 m.\n¿Me superas? ${ORIGEN}/`);
    expect(leerReto(texto.split(" ").at(-1)!, 16)).toBeNull();
  });

  it("una repetición (no cuenta) enlaza la página principal, sin ?reto= con sus puntos", () => {
    const texto = generarTarjeta(diario({ repeticion: true, racha: 0 }));
    expect(texto.split("\n")[1]).toBe(`¿Me superas? ${ORIGEN}/`);
    expect(texto).not.toContain("reto=");
    expect(leerReto(texto.split(" ").at(-1)!, 16)).toBeNull();
  });

  it("la de partida libre enlaza su código con ?libre=", () => {
    const texto = generarTarjeta(libre());
    expect(texto).toBe(`Torre Diaria: 2.310 puntos y 27,1 m en partida libre.\n¿Me superas? ${ORIGEN}/?libre=a1b2c3.2310`);
    expect(texto).not.toContain("Práctica");
    expect(leerLibre(texto.split(" ").at(-1)!)).toEqual({ semilla: "a1b2c3", puntos: 2310 });
    expect(generarTarjeta(libre({ codigo: null })).split("\n")[1]).toBe(`¿Me superas? ${ORIGEN}/`);
  });

  it("la de nivel lleva las estrellas y enlaza la página principal (S19)", () => {
    expect(generarTarjeta(nivel())).toBe(`Torre Diaria: nivel 12 con 3 estrellas.\nJuega en ${ORIGEN}/`);
    expect(generarTarjeta(nivel({ estrellas: 1 }))).toContain("con 1 estrella.");
    expect(generarTarjeta(nivel({ victoria: false, estrellas: 0 })).split("\n")[0]).toBe("Torre Diaria: nivel 12 sin superar todavía.");
  });

  it("ninguna tarjeta lleva emojis ni caracteres fuera del plano básico, en los tres modos", () => {
    const todas = [diario(), diario({ racha: 0 }), diario({ enPiezas: true }), libre(), libre({ codigo: null }), nivel(), nivel({ victoria: false, estrellas: 0 })];
    for (const datos of todas) {
      const texto = generarTarjeta(datos);
      expect(texto, texto).not.toMatch(/\p{Extended_Pictographic}/u);
      expect([...texto].every((c) => c.codePointAt(0)! <= 0xffff), texto).toBe(true);
      expect(texto).not.toMatch(/[★☆♥→]/);
    }
  });

  it("con 0 puntos no deja líneas vacías ni NaN", () => {
    for (const datos of [diario({ puntos: 0, altura: 0 }), libre({ puntos: 0, altura: Number.NaN })]) {
      const texto = generarTarjeta(datos);
      expect(texto).not.toContain("NaN");
      expect(texto.split("\n")).toHaveLength(2);
      expect(texto.split("\n").every((linea) => linea.trim().length > 0)).toBe(true);
    }
  });

  it("todas miden 200 caracteres o menos con puntos de 999.999", () => {
    for (const datos of [
      diario({ dia: 999_999, puntos: 999_999, altura: 999.9, racha: 9999 }),
      libre({ codigo: "1z141z3", puntos: 999_999, altura: 999.9 }),
      nivel({ nivel: 999 }),
    ]) {
      expect(generarTarjeta(datos).length).toBeLessThanOrEqual(200);
    }
  });

  it("mismos datos, mismo texto", () => {
    expect(generarTarjeta(libre())).toBe(generarTarjeta(libre()));
  });
});

describe("formatearNumero", () => {
  it("pone punto de miles desde 4 cifras (A1)", () => {
    expect(formatearNumero(0)).toBe("0");
    expect(formatearNumero(999)).toBe("999");
    expect(formatearNumero(1240)).toBe("1.240");
    expect(formatearNumero(123456)).toBe("123.456");
    expect(formatearNumero(999999)).toBe("999.999");
    expect(formatearNumero(1234567)).toBe("1.234.567");
  });

  it("no da NaN ni decimales con valores raros", () => {
    expect(formatearNumero(Number.NaN)).toBe("0");
    expect(formatearNumero(12.9)).toBe("12");
    expect(formatearNumero(-1500)).toBe("-1.500");
  });

  it("formatearPuntos lo usa", () => {
    expect(formatearPuntos(1)).toBe("1 punto");
    expect(formatearPuntos(1240)).toBe("1.240 puntos");
  });
});
