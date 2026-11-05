import { describe, expect, it } from "vitest";
import { jugarConPerfil, medirPerfil, PERFILES } from "./duracion.ts";

const [cuidadoso, descuidado] = PERFILES as [(typeof PERFILES)[0], (typeof PERFILES)[0]];

describe("duración de las partidas (D6)", () => {
  it("el mismo día y perfil dan siempre la misma partida", () => {
    expect(jugarConPerfil("2026-11-05", descuidado)).toEqual(jugarConPerfil("2026-11-05", descuidado));
  });

  it("en 10 días, la mediana del descuidado es de 30 s o más y la del cuidadoso de 90 s o menos", () => {
    expect(medirPerfil(descuidado, 10).medianaS).toBeGreaterThanOrEqual(30);
    const { medianaS, medidas } = medirPerfil(cuidadoso, 10);
    expect(medianaS).toBeLessThanOrEqual(90);
    // Sigue siendo un reto: ni el cuidadoso llega al tope de 10 minutos.
    for (const medida of medidas) expect(medida.terminada).toBe(true);
  }, 60_000);
});
