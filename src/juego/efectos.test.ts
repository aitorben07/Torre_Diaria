import { describe, expect, it } from "vitest";
import {
  añadirParticulas,
  APLASTAR_MS,
  crearAzarVisual,
  easeOutBack,
  Efectos,
  ESTIRAR_MS,
  escalaAterrizaje,
  escalaSoltar,
  escalaTexto,
  MAX_PARTICULAS,
  SACUDIDA_MS,
  TEXTO_MS,
  valorSacudida,
  type Particula,
} from "./efectos.ts";

const pieza = { forma: "bloque", ancho: 1, alto: 0.8, color: 0 } as const;

function efectos(reducido = false): Efectos {
  return new Efectos({ reducido: () => reducido, ratio: () => 1, conFuente: () => true, destinoVida: () => ({ x: 0, y: 0 }) });
}

describe("curvas (A3)", () => {
  it("la sacudida vale 0 a los 250 ms y después, y no antes", () => {
    expect(valorSacudida(SACUDIDA_MS, 8)).toEqual({ x: 0, y: 0 });
    expect(valorSacudida(400, 8)).toEqual({ x: 0, y: 0 });
    expect(valorSacudida(-1, 8)).toEqual({ x: 0, y: 0 });
    const inicio = valorSacudida(5, 8);
    expect(Math.hypot(inicio.x, inicio.y)).toBeGreaterThan(5);
  });

  it("la sacudida decae: más pequeña cuanto más tarde", () => {
    const tam = (ms: number) => {
      const v = valorSacudida(ms, 8);
      return Math.hypot(v.x, v.y);
    };
    expect(tam(200)).toBeLessThan(8 * (1 - 200 / SACUDIDA_MS) ** 2 + 1e-9);
    expect(tam(240)).toBeLessThan(0.1);
  });

  it("aplastar empieza en (1,12, 0,88) y vuelve a escala 1 a los 160 ms", () => {
    const inicio = escalaAterrizaje(0);
    expect(inicio.x).toBeCloseTo(1.12, 9);
    expect(inicio.y).toBeCloseTo(0.88, 9);
    expect(escalaAterrizaje(APLASTAR_MS)).toEqual({ x: 1, y: 1 });
    expect(escalaAterrizaje(1000)).toEqual({ x: 1, y: 1 });
  });

  it("estirar al soltar empieza en (0,94, 1,06) y acaba a los 80 ms", () => {
    expect(escalaSoltar(0).x).toBeCloseTo(0.94, 9);
    expect(escalaSoltar(0).y).toBeCloseTo(1.06, 9);
    expect(escalaSoltar(ESTIRAR_MS)).toEqual({ x: 1, y: 1 });
  });

  it("el texto pasa de 0,6 a 1,1 y a 1 en 220 ms", () => {
    expect(escalaTexto(0)).toBeCloseTo(0.6, 9);
    expect(escalaTexto(TEXTO_MS * 0.6)).toBeCloseTo(1.1, 9);
    expect(escalaTexto(TEXTO_MS)).toBe(1);
  });

  it("ease-out-back sale de 0, se pasa de 1 y acaba en 1", () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 9);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1);
    expect(easeOutBack(1)).toBe(1);
  });
});

describe("partículas", () => {
  const una = (desde: number): Particula => ({ tipo: "polvo", x: 0, y: 0, vx: 0, vy: 0, giro: 0, vgiro: 0, tam: 0.1, color: "#000000", desde, vida: 1000 });

  it("nunca hay más de 200 vivas: si no caben, se van las más viejas", () => {
    let lista: Particula[] = [];
    for (let i = 0; i < 50; i++) lista = añadirParticulas(lista, Array.from({ length: 12 }, () => una(i)));
    expect(lista).toHaveLength(MAX_PARTICULAS);
    expect(lista[0]!.desde).toBeGreaterThan(30);
  });

  it("con muchos perfectos, confeti y chapuzones seguidos, Efectos no pasa de 200", () => {
    const e = efectos();
    for (let i = 0; i < 40; i++) {
      e.aterrizaje(pieza, 0, 1, "perfecto", 5, i);
      e.colocada("perfecto", 5, 60, 0, 1, i);
      e.chapuzon(0, -0.75, i);
    }
    expect(e.vivas).toBeLessThanOrEqual(MAX_PARTICULAS);
  });

  it("con movimiento reducido, la mitad de partículas y sin sacudida", () => {
    const normal = efectos();
    const reducido = efectos(true);
    normal.aterrizaje(pieza, 0, 1, "perfecto", 1, 0);
    reducido.aterrizaje(pieza, 0, 1, "perfecto", 1, 0);
    expect(reducido.vivas).toBeLessThanOrEqual(Math.ceil(normal.vivas / 2) + 1);
    reducido.caida(0);
    expect(reducido.sacudida(10)).toEqual({ x: 0, y: 0 });
    normal.caida(0);
    expect(Math.hypot(normal.sacudida(10).x, normal.sacudida(10).y)).toBeGreaterThan(0);
  });
});

describe("contadores de efectos", () => {
  it("cada evento suma su efecto", () => {
    const e = efectos();
    e.colocada("perfecto", 3, 40, 0, 1, 0);
    e.colocada("bueno", 0, 15, 0, 1, 0);
    e.colocada("normal", 0, 10, 0, 1, 0);
    e.caida(0);
    e.vidaExtra(0, 1, 0);
    e.hitoAltura(5, 0);
    expect(e.contadores).toMatchObject({
      "colocada-perfecto": 1,
      "colocada-bueno": 1,
      "colocada-normal": 1,
      confeti: 1,
      caida: 1,
      vidaExtra: 1,
      hito: 1,
    });
  });
});

describe("efectos de las piezas especiales (H3)", () => {
  it("cada especial que actúa suma su contador, con partículas acotadas", () => {
    const e = efectos();
    for (let i = 0; i < 30; i++) {
      e.especial("dorada", pieza, 0, 1, i);
      e.especial("pegajosa", pieza, 0, 1, i);
      e.especial("cemento", pieza, 0, 1, i);
    }
    expect(e.contadores).toMatchObject({ "especial-dorada": 30, "especial-pegajosa": 30, "especial-cemento": 30 });
    expect(e.vivas).toBeLessThanOrEqual(MAX_PARTICULAS);
  });

  it("la dorada suelta chispas, la pegajosa gotas y la de cemento ninguna (su efecto es la ola)", () => {
    for (const [especial, conParticulas] of [["dorada", true], ["pegajosa", true], ["cemento", false]] as const) {
      const e = efectos();
      e.especial(especial, pieza, 0, 1, 0);
      expect(e.vivas > 0).toBe(conParticulas);
    }
  });

  it("con movimiento reducido la de cemento no lanza la ola, pero cuenta igual", () => {
    // Se dibuja el mundo en un contexto falso que apunta los rellenos: sin ola, ningún fillRect.
    const rellenos = (reducido: boolean) => {
      const e = efectos(reducido);
      e.especial("cemento", pieza, 0, 4, 0);
      let n = 0;
      const ctx = new Proxy({}, { get: (_, nombre) => (nombre === "fillRect" ? () => n++ : () => undefined), set: () => true });
      e.dibujarMundo(ctx as CanvasRenderingContext2D, 100);
      return { n, cuenta: e.contadores["especial-cemento"] };
    };
    expect(rellenos(false)).toEqual({ n: 1, cuenta: 1 });
    expect(rellenos(true)).toEqual({ n: 0, cuenta: 1 });
  });
});

describe("azar visual", () => {
  it("es repetible y no depende del azar de la partida", () => {
    const a = crearAzarVisual(7);
    const b = crearAzarVisual(7);
    const serie = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(serie);
    expect(serie.every((n) => n >= 0 && n < 1)).toBe(true);
  });
});
