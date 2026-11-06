import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COLORES, contraste, PARES_TEXTO, variableCss, type NombreColor } from "./temas.ts";

const css = readFileSync(new URL("../estilos.css", import.meta.url), "utf8");

describe("paleta «Riso» (A1)", () => {
  it("cada color de temas.ts es una variable de estilos.css con el mismo valor", () => {
    for (const [nombre, valor] of Object.entries(COLORES)) {
      const encontrada = new RegExp(`${variableCss(nombre as NombreColor)}:\\s*(#[0-9A-Fa-f]{6});`).exec(css);
      expect(encontrada?.[1]?.toUpperCase(), nombre).toBe(valor.toUpperCase());
    }
  });

  it("estilos.css no tiene colores sueltos fuera de las variables", () => {
    const sinRaiz = css.replace(/:root\s*\{[^}]*\}/, "");
    expect(sinRaiz.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\(/g) ?? []).toEqual([]);
  });

  it("todos los pares de texto y fondo cumplen el contraste WCAG", () => {
    expect(PARES_TEXTO.length).toBeGreaterThan(3);
    for (const { texto, fondo, px, uso } of PARES_TEXTO) {
      const minimo = px >= 24 ? 3 : 4.5;
      expect(contraste(COLORES[texto], COLORES[fondo]), uso).toBeGreaterThanOrEqual(minimo);
    }
  });

  it("el contraste se calcula como WCAG: negro sobre blanco es 21:1", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 6);
    expect(contraste("#777777", "#777777")).toBeCloseTo(1, 6);
  });
});
