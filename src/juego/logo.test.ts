import { describe, expect, it } from "vitest";
import { ALTO_LOGO, ANCHO_LOGO, faviconSvg, LOGO, MUELLE, PARES_LOGO } from "./logo.ts";
import { COLORES, contraste } from "./temas.ts";

describe("logo (G1, Anexo E)", () => {
  it("las letras y los contornos contrastan al menos 3:1 con su fondo (texto grande y gráficos)", () => {
    expect(PARES_LOGO.some((par) => par.uso === "letras" && par.fondo === "papel")).toBe(true);
    for (const { color, fondo, uso } of PARES_LOGO) {
      expect(contraste(COLORES[color], COLORES[fondo]), uso).toBeGreaterThanOrEqual(3);
    }
  });

  it("dice «TRRE» + la pieza de la «O» y «DARA» + las dos «I», con giros fijos entre −4° y 4°", () => {
    expect(LOGO.letras.map((l) => l.letra).join("")).toBe("TRREDARA");
    for (const l of LOGO.letras) {
      expect(Math.abs(l.giro)).toBeLessThanOrEqual(4);
      expect(l.giro).not.toBe(0);
    }
    for (const p of LOGO.piezas) expect(Math.abs(p.giro)).toBeLessThanOrEqual(4);
    // La «O» es la primera pieza: turquesa, con ojos y colgada del gancho, encima de ella.
    const [o] = LOGO.piezas;
    expect(o).toMatchObject({ color: "turquesa", ojos: true });
    expect(LOGO.gancho.x).toBeCloseTo(o!.x + o!.ancho / 2, 0);
    expect(LOGO.gancho.y).toBeLessThan(o!.y);
  });

  it("todo cabe en su caja: letras, piezas y muelle dentro de ANCHO_LOGO × ALTO_LOGO", () => {
    for (const p of LOGO.piezas) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.ancho).toBeLessThanOrEqual(ANCHO_LOGO);
      expect(p.y + p.alto).toBeLessThanOrEqual(ALTO_LOGO);
    }
    for (const l of LOGO.letras) {
      expect(l.x).toBeGreaterThan(0);
      expect(l.x).toBeLessThan(ANCHO_LOGO);
      expect(l.base).toBeLessThan(MUELLE.tablero.y);
    }
    expect(MUELLE.tablero.x + MUELLE.tablero.ancho).toBeLessThanOrEqual(ANCHO_LOGO);
    expect(MUELLE.tablero.y + MUELLE.tablero.alto).toBeLessThan(ALTO_LOGO);
  });

  it("el favicon es solo el icono, con trazados y los colores de la paleta, sin texto", () => {
    const svg = faviconSvg();
    expect(svg).toMatch(/^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg' viewBox='0 0 32 32'>.*<\/svg>$/);
    expect(svg).not.toMatch(/<text|<image|style=|"/);
    for (const color of svg.match(/#[0-9A-Fa-f]{6}/g) ?? []) expect(Object.values(COLORES)).toContain(color);
    expect(svg).toContain(COLORES.turquesa);
    expect(svg).toContain(COLORES.naranja);
  });
});
