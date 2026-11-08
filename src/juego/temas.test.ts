import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ESCENARIOS, TEMAS } from "../logica/catalogo.ts";
import { COLORES, contraste, escenarioPorId, ESCENARIOS_DIBUJO, PARES_TEXTO, temaPorId, TEMAS_DIBUJO, variableCss, type NombreColor } from "./temas.ts";

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

describe("temas y escenarios de la colección (C3)", () => {
  it("cada tema y escenario del catálogo tiene su dibujo, con el mismo id y nombre", () => {
    expect(TEMAS_DIBUJO.map((t) => [t.id, t.nombre])).toEqual(TEMAS.map((t) => [t.id, t.nombre]));
    expect(ESCENARIOS_DIBUJO.map((e) => [e.id, e.nombre])).toEqual(ESCENARIOS.map((e) => [e.id, e.nombre]));
  });

  it("cada tema da un color por índice de la paleta, todos #RRGGBB", () => {
    for (const tema of TEMAS_DIBUJO) {
      expect(tema.piezas, tema.id).toHaveLength(7);
      for (const color of [...tema.piezas, tema.contorno, tema.trama, tema.piedra]) expect(color, tema.id).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("los temas se distinguen: no hay dos con los mismos colores de piezas", () => {
    const firmas = TEMAS_DIBUJO.map((t) => t.piezas.join());
    expect(new Set(firmas).size).toBe(firmas.length);
  });

  it("un id desconocido da Riso y Puerto", () => {
    expect(temaPorId("nada").id).toBe("riso");
    expect(escenarioPorId("nada").id).toBe("puerto");
    expect(escenarioPorId("nubes").mar).toBe("nubes");
  });
});
