import { describe, expect, it } from "vitest";
import { TOLERANCIA_PERFECTO } from "./puntuacion.ts";
import {
  RACHA_COMBO,
  RACHA_MULT,
  RELOJ_MULT,
  RESPIRO_CAIDA,
  RESPIRO_SEGUIR,
  siguienteRitmo,
  VEL_INCREMENTO,
  VEL_INICIAL,
  VEL_TOPE,
  velocidadDe,
} from "./ritmo.ts";
import { AMPLITUD, Partida } from "./simulacion.ts";

describe("velocidad por ritmo (B1, tercera versión)", () => {
  it("valores medidos en impacto 2.1: 1,3 m/s, +0,025, tope 3,4, respiro 4 y racha ×1,08 con combo 5", () => {
    expect([VEL_INICIAL, VEL_INCREMENTO, VEL_TOPE, RESPIRO_CAIDA, RESPIRO_SEGUIR, RACHA_COMBO, RACHA_MULT, RELOJ_MULT]).toEqual([
      1.3, 0.025, 3.4, 4, 8, 5, 1.08, 0.6,
    ]);
  });

  it.each([
    // [ritmo, opciones, velocidad]
    [0, {}, 1.3],
    [1, {}, 1.33],
    [10, {}, 1.55],
    [84, {}, 3.4],
    [85, {}, 3.4],
    [500, {}, 3.4],
    [0, { combo: RACHA_COMBO - 1 }, 1.3],
    [0, { combo: RACHA_COMBO }, 1.4],
    [10, { combo: 12 }, 1.67],
    [84, { combo: 12 }, 3.4],
    [0, { reloj: true }, 1.3 * 0.6],
    [10, { combo: 5, reloj: true }, 1.67 * 0.6],
    [0, { inicial: 0.9 }, 0.9],
    [4, { inicial: 0.9 }, 1],
    [-3, {}, 1.3],
  ] as const)("ritmo %d con %j da %d m/s", (ritmo, opciones, velocidad) => {
    expect(velocidadDe(ritmo, opciones)).toBeCloseTo(velocidad, 12);
  });

  it("nunca baja de la inicial ni pasa del tope sin reloj, en 400 ritmos y combos de 0 a 9", () => {
    for (let ritmo = 0; ritmo < 400; ritmo++) {
      for (let combo = 0; combo < 10; combo++) {
        const v = velocidadDe(ritmo, { combo });
        expect(v).toBeGreaterThanOrEqual(VEL_INICIAL);
        expect(v).toBeLessThanOrEqual(VEL_TOPE);
        // El reloj frena exactamente RELOJ_MULT (requisito de I1, impacto).
        expect(Math.abs(velocidadDe(ritmo, { combo, reloj: true }) - v * RELOJ_MULT)).toBeLessThan(0.001);
      }
    }
  });

  it("soltar sube el ritmo 1; caer lo baja RESPIRO_CAIDA y seguir RESPIRO_SEGUIR, sin bajar de 0", () => {
    expect(siguienteRitmo(0, "soltada")).toBe(1);
    expect(siguienteRitmo(10, "caida")).toBe(10 - RESPIRO_CAIDA);
    expect(siguienteRitmo(10, "seguir")).toBe(10 - RESPIRO_SEGUIR);
    expect(siguienteRitmo(2, "caida")).toBe(0);
    expect(siguienteRitmo(2, "seguir")).toBe(0);
    expect(velocidadDe(siguienteRitmo(10, "caida"))).toBeLessThan(velocidadDe(10));
  });

  it("la primera pieza llega al centro en 2,0 s o menos y su ventana del perfecto es de 0,09 s o más (B2)", () => {
    expect(AMPLITUD / VEL_INICIAL).toBeLessThanOrEqual(2);
    expect(TOLERANCIA_PERFECTO / VEL_INICIAL).toBeGreaterThanOrEqual(0.09);
  });
});

/** ¿La pieza que cuelga pasa en este paso por `x`? */
function pasaPor(partida: Partida, x: number): boolean {
  const { colgada } = partida.estado();
  return colgada !== null && Math.abs(colgada.x - x) <= colgada.velocidad / 120 + 1e-9;
}

describe("la partida lleva el ritmo (B1)", () => {
  it("la primera pieza cuelga a VEL_INICIAL, y la de un nivel, a la del nivel", () => {
    expect(new Partida("2026-11-05").estado().colgada!.velocidad).toBe(VEL_INICIAL);
    expect(new Partida("2026-11-05", { velocidad: 1.7 }).estado().colgada!.velocidad).toBe(1.7);
  });

  it("tras una caída la pieza siguiente va más despacio que la anterior", () => {
    const partida = new Partida("2026-11-05");
    const velocidades: number[] = [];
    let soltadas = 0;
    let caidas = 0;
    while (caidas === 0 && partida.pasos < 20_000) {
      const { colgada, objetivo } = partida.estado();
      // Tres perfectos y la cuarta en el extremo, que cae.
      const tocar = colgada !== null && (soltadas < 3 ? pasaPor(partida, objetivo) : Math.abs(Math.abs(colgada.x) - AMPLITUD) < 1e-9);
      if (tocar) {
        velocidades.push(colgada.velocidad);
        partida.soltar();
        soltadas++;
      }
      partida.paso();
      caidas += partida.tomarEventos().filter((e) => e.tipo === "caida").length;
    }
    expect(caidas).toBe(1);
    expect(velocidades).toEqual([1.3, 1.33, 1.35, 1.38]);
    // Ritmo 4 − 4 = 0: vuelve a la inicial.
    expect(partida.estado().colgada!.velocidad).toBe(1.3);
    expect(partida.estado().colgada!.velocidad).toBeLessThan(velocidades.at(-1)!);
  });

  it("sin caídas ni cambio de racha, la velocidad no baja de una pieza a la siguiente en 150 piezas", () => {
    // Jugador que siempre acierta: llega a 150 piezas en esta semilla, con
    // alguna caída por la física. Un jugador que rompe el combo con buenos
    // para no ir nunca en racha derrumba la torre antes de 30 piezas, así que
    // se comparan las piezas seguidas sin caída en medio y con la misma racha,
    // y cada velocidad con la fórmula.
    const partida = new Partida("2026-11-09");
    const colgadas: Array<{ velocidad: number; combo: number; ritmo: number; caidasAntes: number }> = [];
    let caidas = 0;
    let ritmo = 0;
    while (!partida.terminada && colgadas.length < 150 && partida.pasos < 100_000) {
      const { colgada, objetivo, combo } = partida.estado();
      if (colgada && pasaPor(partida, objetivo)) {
        colgadas.push({ velocidad: colgada.velocidad, combo, ritmo, caidasAntes: caidas });
        partida.soltar();
        ritmo = siguienteRitmo(ritmo, "soltada");
      }
      partida.paso();
      for (const evento of partida.tomarEventos()) {
        if (evento.tipo !== "caida") continue;
        caidas++;
        ritmo = siguienteRitmo(ritmo, "caida");
      }
    }
    expect(colgadas).toHaveLength(150);
    let comparadas = 0;
    for (const [i, colgada] of colgadas.entries()) {
      expect(colgada.velocidad).toBe(velocidadDe(colgada.ritmo, { combo: colgada.combo }));
      if (i === 0) continue;
      const anterior = colgadas[i - 1]!;
      if (anterior.caidasAntes !== colgada.caidasAntes) continue;
      if (anterior.combo >= RACHA_COMBO !== colgada.combo >= RACHA_COMBO) continue;
      expect(colgada.velocidad).toBeGreaterThanOrEqual(anterior.velocidad);
      comparadas++;
    }
    expect(comparadas).toBeGreaterThan(100);
    expect(Math.max(...colgadas.map((c) => c.velocidad))).toBe(VEL_TOPE);
  }, 60_000);
});
