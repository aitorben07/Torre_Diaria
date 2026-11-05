import { describe, expect, it } from "vitest";
import { ESPACIO_SOBRE_CIMA, MARGEN_BAJO_TARJETA, MARGEN_SUELO, objetivoCamara } from "./dibujo.ts";

/** Metros entre el borde inferior de la vista y la cima, con la cámara en `camara`. */
const cimaSobreBorde = (altura: number, camara: number) => altura - camara + MARGEN_SUELO;

// Vista de un móvil de 390×844: unos 18,9 m de alto para 9,2 m de ancho.
const ALTO_MOVIL = 18.9;

describe("objetivoCamara", () => {
  it("con la torre baja deja el suelo abajo del todo", () => {
    expect(objetivoCamara(0, ALTO_MOVIL)).toBe(0);
    expect(objetivoCamara(5, ALTO_MOVIL)).toBe(0);
  });

  it("sigue a la torre: la cima y la pieza que cuelga siempre caben, sin cielo de sobra", () => {
    for (const altura of [14, 20, 45]) {
      const camara = objetivoCamara(altura, ALTO_MOVIL);
      expect(camara).toBeGreaterThan(0);
      expect(cimaSobreBorde(altura, camara)).toBeCloseTo(ALTO_MOVIL - ESPACIO_SOBRE_CIMA, 9);
    }
  });

  it("con la tarjeta de fin, una torre alta sube hasta dejar la cima justo debajo", () => {
    const tapado = 10;
    for (const altura of [8, 14, 30]) {
      const camara = objetivoCamara(altura, ALTO_MOVIL, tapado);
      expect(cimaSobreBorde(altura, camara)).toBeCloseTo(ALTO_MOVIL - tapado - MARGEN_BAJO_TARJETA, 9);
    }
  });

  it("con la tarjeta de fin, una torre baja que ya cabe debajo no mueve el suelo", () => {
    const tapado = 10;
    for (const altura of [0, 2, 6]) {
      expect(objetivoCamara(altura, ALTO_MOVIL, tapado)).toBe(0);
      expect(cimaSobreBorde(altura, 0)).toBeLessThanOrEqual(ALTO_MOVIL - tapado - MARGEN_BAJO_TARJETA);
    }
  });

  it("si la tarjeta tapa casi toda la vista, encuadra como durante la partida", () => {
    expect(objetivoCamara(20, ALTO_MOVIL, ALTO_MOVIL - 1)).toBe(objetivoCamara(20, ALTO_MOVIL));
  });
});
