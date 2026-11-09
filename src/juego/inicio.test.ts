import { describe, expect, it } from "vitest";
import { AMPLITUD } from "../logica/simulacion.ts";
import { VEL_INICIAL } from "../logica/ritmo.ts";
import { ALTURA_PIEZA, estadoDeInicio } from "./inicio.ts";

describe("escena de inicio (E2)", () => {
  it("sin torre ni piezas sueltas: solo la pieza que cuelga, a la velocidad inicial", () => {
    const estado = estadoDeInicio(0, 20);
    expect(estado.cuerpos).toEqual([]);
    expect(estado.altura).toBe(0);
    expect(estado.colgada?.velocidad).toBe(VEL_INICIAL);
    expect(estado.colgada?.y).toBe(20 * ALTURA_PIEZA);
  });

  it("la pieza se mece dentro del vaivén de la partida y vuelve a pasar por el centro", () => {
    const xs = Array.from({ length: 200 }, (_, i) => estadoDeInicio(i * 0.05, 20).colgada!.x);
    for (const x of xs) expect(Math.abs(x)).toBeLessThanOrEqual(AMPLITUD + 1e-9);
    expect(Math.max(...xs)).toBeCloseTo(AMPLITUD, 1);
    expect(Math.min(...xs)).toBeCloseTo(-AMPLITUD, 1);
    // Siempre la misma pieza: el dibujo no cambia entre fotogramas.
    expect(estadoDeInicio(1, 20).colgada!.pieza).toBe(estadoDeInicio(2, 20).colgada!.pieza);
  });

  it("con muy poca vista, la pieza no baja de la plataforma", () => {
    const { colgada } = estadoDeInicio(0, 0);
    expect(colgada!.y).toBeGreaterThanOrEqual(colgada!.pieza.alto);
  });
});

describe("pieza del inicio", () => {
  it("es un cuadrado, que lleva ojos", () => {
    expect(estadoDeInicio(0, 20).colgada!.pieza.forma).toBe("cuadrado");
  });
});
