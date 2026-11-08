import { describe, expect, it } from "vitest";
import { crearReto, leerReto } from "./reto.ts";

const HOY = 100;

describe("reto", () => {
  it("leerReto(crearReto(12, 34)) devuelve el mismo reto", () => {
    expect(crearReto(12, 34)).toBe("?reto=12.34");
    expect(leerReto(crearReto(12, 34), HOY)).toEqual({ dia: 12, puntos: 34 });
  });

  it("admite los puntos de la v2, hasta 999.999 (D3)", () => {
    expect(leerReto(crearReto(12, 123456), HOY)).toEqual({ dia: 12, puntos: 123456 });
    expect(leerReto("?reto=12.999999", HOY)).toEqual({ dia: 12, puntos: 999999 });
    expect(leerReto("?reto=12.1000", HOY)).toEqual({ dia: 12, puntos: 1000 });
  });

  it("lee el reto de un enlace completo", () => {
    expect(leerReto("https://torre.example/?reto=3.0", HOY)).toEqual({ dia: 3, puntos: 0 });
    expect(leerReto(`?reto=${HOY}.999`, HOY)).toEqual({ dia: HOY, puntos: 999 });
  });

  it.each([
    "abc",
    "12",
    "12.",
    "-1.5",
    "0.5",
    "12.-3",
    "12.1000000",
    "12.0123",
    `${HOY + 1}.5`,
    "1.5".padEnd(21, "0"),
    "<script>",
    "1.5<img src=x onerror=alert(1)>",
    "01.5",
    "1.05",
    " 1.5",
  ])("devuelve null con %j", (valor) => {
    expect(leerReto(`?reto=${encodeURIComponent(valor)}`, HOY)).toBeNull();
  });

  it("devuelve null sin parámetro reto", () => {
    expect(leerReto("", HOY)).toBeNull();
    expect(leerReto("https://torre.example/", HOY)).toBeNull();
  });

  it("rechaza más de 20 caracteres aunque el formato encaje", () => {
    expect(leerReto(`?reto=${"1".repeat(18)}.5`, 10 ** 20)).toBeNull();
  });
});
