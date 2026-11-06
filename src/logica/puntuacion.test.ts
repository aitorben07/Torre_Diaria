import { describe, expect, it } from "vitest";
import {
  calidadDeSuelta,
  Marcador,
  PIEZA_PERFECTO_FINAL,
  puntosDeColocada,
  TOLERANCIA_BUENO,
  TOLERANCIA_PERFECTO,
  VIDAS_MAX,
  type Calidad,
} from "./puntuacion.ts";

/** Coloca las piezas dadas y, al final, mide la altura de la torre. */
function partida(calidades: Calidad[], altura: number, vidas?: number): Marcador {
  const marcador = new Marcador(vidas);
  for (const calidad of calidades) marcador.colocar(calidad);
  marcador.medirAltura(altura);
  return marcador;
}

describe("calidadDeSuelta", () => {
  it("perfecto hasta TOLERANCIA_PERFECTO, bueno hasta TOLERANCIA_BUENO y normal después", () => {
    expect(calidadDeSuelta(0, 0)).toBe("perfecto");
    expect(calidadDeSuelta(TOLERANCIA_PERFECTO, 0)).toBe("perfecto");
    expect(calidadDeSuelta(TOLERANCIA_PERFECTO + 0.001, 0)).toBe("bueno");
    expect(calidadDeSuelta(0.2, 0)).toBe("bueno");
    expect(calidadDeSuelta(TOLERANCIA_BUENO, 0)).toBe("bueno");
    expect(calidadDeSuelta(TOLERANCIA_BUENO + 0.001, 0)).toBe("normal");
  });

  it("desde la pieza 100, d = 0,10 m ya no es perfecto", () => {
    expect(calidadDeSuelta(0.1, PIEZA_PERFECTO_FINAL - 1)).toBe("perfecto");
    expect(calidadDeSuelta(0.1, PIEZA_PERFECTO_FINAL)).toBe("bueno");
    expect(calidadDeSuelta(0.08, PIEZA_PERFECTO_FINAL)).toBe("perfecto");
  });
});

describe("puntosDeColocada", () => {
  it("10 por pieza, 10 × min(combo, 5) por perfecto y 5 por bueno", () => {
    expect(puntosDeColocada("normal", 0)).toBe(10);
    expect(puntosDeColocada("bueno", 0)).toBe(15);
    expect([1, 2, 3, 4, 5, 6, 9].map((combo) => puntosDeColocada("perfecto", combo))).toEqual([
      20, 30, 40, 50, 60, 60, 60,
    ]);
  });
});

describe("ejemplos del Anexo 1, apartado 2.3", () => {
  it("1. perfecto, perfecto, bueno y normal con una torre de 3,1 m dan 75", () => {
    expect(partida(["perfecto", "perfecto", "bueno", "normal"], 3.1).puntos).toBe(75);
  });

  it("2. siete perfectos seguidos pasando de 5 m dan 370; con 2 vidas, la quinta da una vida", () => {
    const marcador = new Marcador(2);
    const vidasExtra: number[] = [];
    for (let i = 1; i <= 7; i++) if (marcador.colocar("perfecto").vidaExtra) vidasExtra.push(i);
    expect(marcador.medirAltura(5.4)).toEqual([5]);
    expect(marcador.puntos).toBe(370);
    expect(vidasExtra).toEqual([5]);
    expect(marcador.vidas).toBe(3);
  });

  it("3. diez piezas con 2 perfectos sueltos y 3 buenos, torre de 6 m: 185", () => {
    const calidades: Calidad[] = [
      "perfecto", "normal", "bueno", "normal", "perfecto", "normal", "bueno", "normal", "bueno", "normal",
    ];
    const marcador = partida(calidades, 6);
    expect(marcador.puntos).toBe(185);
    expect(marcador.comboMax).toBe(1);
  });

  it("4. derrumbe: la pieza 11 no puntúa, siguen 185, y el hito de 5 m no se vuelve a cobrar", () => {
    const calidades: Calidad[] = [
      "perfecto", "normal", "bueno", "normal", "perfecto", "normal", "bueno", "normal", "bueno", "normal",
    ];
    const marcador = partida(calidades, 6);
    // La pieza 11 cae y arrastra a la 8, la 9 y la 10: un episodio, una vida.
    expect(marcador.caer()).toBe(2);
    expect(marcador.puntos).toBe(185);
    expect(marcador.medirAltura(4.2)).toEqual([]);
    marcador.colocar("normal");
    expect(marcador.medirAltura(5.6)).toEqual([]);
    expect(marcador.puntos).toBe(195);
    expect(marcador.medirAltura(10.3)).toEqual([10]);
    expect(marcador.puntos).toBe(245);
  });

  it("5. con 1 vida, una caída deja 0 vidas y los puntos acumulados", () => {
    const marcador = partida(["perfecto", "bueno"], 1.5, 1);
    expect(marcador.caer()).toBe(0);
    expect(marcador.puntos).toBe(35);
    expect(marcador.combo).toBe(0);
  });
});

describe("Marcador", () => {
  it("un bueno, un normal o una caída ponen el combo a 0", () => {
    const marcador = new Marcador();
    marcador.colocar("perfecto");
    marcador.colocar("perfecto");
    expect(marcador.colocar("bueno").combo).toBe(0);
    marcador.colocar("perfecto");
    expect(marcador.colocar("normal").combo).toBe(0);
    marcador.colocar("perfecto");
    marcador.caer();
    expect(marcador.combo).toBe(0);
    expect(marcador.comboMax).toBe(2);
  });

  it("con 3 vidas, 5 perfectos seguidos no pasan de VIDAS_MAX; con 1 vida, 10 perfectos dan dos vidas", () => {
    const llena = new Marcador(3);
    for (let i = 0; i < 5; i++) expect(llena.colocar("perfecto").vidaExtra).toBe(false);
    expect(llena.vidas).toBe(VIDAS_MAX);
    const dos = new Marcador(1);
    const extra = Array.from({ length: 10 }, () => dos.colocar("perfecto").vidaExtra);
    expect(extra.filter(Boolean)).toHaveLength(2);
    expect(dos.vidas).toBe(3);
  });

  it("el hito de 5 m se cobra una sola vez aunque la torre baje y vuelva a pasar de 5 m", () => {
    const marcador = new Marcador();
    expect(marcador.medirAltura(5.2)).toEqual([5]);
    expect(marcador.medirAltura(3.9)).toEqual([]);
    expect(marcador.medirAltura(5.8)).toEqual([]);
    expect(marcador.medirAltura(15.1)).toEqual([10, 15]);
    expect(marcador.puntos).toBe(150);
    expect(marcador.hitos).toBe(3);
  });

  it("monedas: 1 por pieza, 1 más por perfecto y 5 por hito (Anexo 1, 4.2)", () => {
    const marcador = partida(["perfecto", "perfecto", "bueno", "normal"], 5.1);
    expect(marcador.monedas).toBe(4 + 2 + 5);
  });
});
