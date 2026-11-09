import { describe, expect, it } from "vitest";
import { nivelPorNumero } from "../src/logica/niveles.ts";
import { PERFILES } from "./duracion.ts";
import { fallos, medirNivel, redondear50, umbrales, type MedidaNivel } from "./niveles.ts";

const perfil = (nombre: string) => PERFILES.find((p) => p.nombre === nombre)!;

function medida(perfilNombre: string, nivel: number, cambios: Partial<MedidaNivel> = {}): MedidaNivel {
  return { nivel, perfil: perfilNombre, ganadas: 10, tresEstrellas: 10, puntosGanadas: 200, segundosGanadas: 40, medidas: [], ...cambios };
}

describe("validación de los niveles (E2)", () => {
  it("cada intento usa errores distintos y el mismo intento da la misma partida", () => {
    const nivel = nivelPorNumero(4)!;
    const a = medirNivel(nivel, perfil("novato"), 3);
    expect(a).toEqual(medirNivel(nivel, perfil("novato"), 3));
    expect(new Set(a.medidas.map((m) => `${m.puntos}|${m.segundos}`)).size).toBeGreaterThan(1);
    expect(a.medidas.every((m) => m.terminada)).toBe(true);
  });

  it("p3 es la mediana del experto y p2 la del medio, redondeadas a 50 hacia abajo y con p2 < p3", () => {
    expect(redondear50(449)).toBe(400);
    expect(umbrales(medida("medio", 1, { puntosGanadas: 430 }), medida("experto", 1, { puntosGanadas: 720 }))).toEqual({ p2: 400, p3: 700 });
    expect(umbrales(medida("medio", 1, { puntosGanadas: 140 }), medida("experto", 1, { puntosGanadas: 140 }))).toEqual({ p2: 50, p3: 100 });
    expect(umbrales(medida("medio", 1, { puntosGanadas: null }), medida("experto", 1))).toBeNull();
    expect(umbrales(medida("medio", 1, { puntosGanadas: 60 }), medida("experto", 1, { puntosGanadas: 90 }))).toBeNull();
  });

  it("señala cada requisito que no se cumple", () => {
    const errores = fallos([
      medida("novato", 2, { ganadas: 5 }),
      medida("novato", 9, { ganadas: 0 }),
      medida("medio", 10, { ganadas: 4, medidas: [] }),
      medida("medio", 3, { ganadas: 5 }),
      medida("experto", 7, { tresEstrellas: 2 }),
    ]);
    expect(errores).toEqual([
      "novato gana el nivel 2 5/10",
      "medio gana el nivel 3 5/10 (< 6)",
      "experto con 3 estrellas en el nivel 7 2/10",
      "duración mediana del medio al ganar 0.0 s (fuera de 30 a 120)",
    ]);
  });
});
