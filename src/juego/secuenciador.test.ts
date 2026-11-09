import { describe, expect, it } from "vitest";
import { CORCHEAS, INICIO, PARTIDA, type Pista } from "./partituras.ts";
import { momentoDe, Secuenciador, segundosCorchea, type NotaProgramada } from "./secuenciador.ts";

/** Azar con semilla para las ventanas (mulberry32): la prueba sale siempre igual. */
function azar(semilla: number): () => number {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Las notas que debería dar `pista` desde `inicio` durante `vueltas` vueltas, con la capa fija. */
function esperadas(pista: Pista, inicio: number, capa: number, vueltas: number): Array<Pick<NotaProgramada, "compas" | "indice" | "tiempo">> {
  const compas = CORCHEAS * segundosCorchea(pista.bpm);
  const salida: Array<Pick<NotaProgramada, "compas" | "indice" | "tiempo">> = [];
  for (let v = 0; v < vueltas; v++) {
    pista.compases.forEach((c, i) => {
      const desde = inicio + (v * pista.compases.length + i) * compas;
      c.notas.forEach((n, indice) => {
        if (n.capa <= capa) salida.push({ compas: i, indice, tiempo: desde + momentoDe(pista, n.corchea) });
      });
    });
  }
  return salida;
}

describe("secuenciador (D1)", () => {
  it("1.000 ventanas seguidas de 10 a 200 ms dan cada nota una sola vez, sin huecos ni repetidas, en 3 vueltas", () => {
    const pista = INICIO;
    const sec = new Secuenciador(pista, 1, 2);
    const vuelta = pista.compases.length * CORCHEAS * segundosCorchea(pista.bpm);
    const dado = azar(7);
    const dadas: NotaProgramada[] = [];
    let ahora = 0;
    // 1.000 ventanas de media 105 ms son unos 105 s; se siguen hasta pasar las 3 vueltas (131 s).
    for (let i = 0; i < 1000 || ahora < 1 + 3 * vuelta; i++) {
      ahora += 0.01 + dado() * 0.19;
      const notas = sec.notas(ahora);
      for (const n of notas) expect(n.tiempo).toBeLessThan(ahora);
      dadas.push(...notas);
    }
    const tres = dadas.filter((n) => n.tiempo < 1 + 3 * vuelta - 1e-9);
    const quiero = esperadas(pista, 1, 2, 3);
    expect(tres.map((n) => [n.compas, n.indice])).toEqual(quiero.map((n) => [n.compas, n.indice]));
    tres.forEach((n, i) => expect(n.tiempo).toBeCloseTo(quiero[i]!.tiempo, 9));
  });

  it("la capa pedida a mitad de compás se aplica al empezar el siguiente", () => {
    const compas = CORCHEAS * segundosCorchea(PARTIDA.bpm);
    const sec = new Secuenciador(PARTIDA, 0, 0);
    const primero = sec.notas(compas / 2);
    expect(primero.some((n) => n.instrumento === "bajo")).toBe(false);
    sec.capaPedida = 2;
    const restoDelPrimero = sec.notas(compas - 1e-6);
    expect(restoDelPrimero.some((n) => n.instrumento === "bajo" || n.instrumento === "bombo")).toBe(false);
    const segundo = sec.notas(compas * 2 - 1e-6);
    expect(segundo.some((n) => n.instrumento === "bajo")).toBe(true);
    expect(segundo.some((n) => n.instrumento === "bombo")).toBe(true);
    expect(segundo.every((n) => n.compas === 1)).toBe(true);
    expect(sec.capa).toBe(2);
  });

  it("la pista pedida a mitad de compás empieza al acabar este, desde su primer compás y con su tempo", () => {
    const compasInicio = CORCHEAS * segundosCorchea(INICIO.bpm);
    const sec = new Secuenciador(INICIO, 0, 1, 3);
    sec.notas(compasInicio / 3);
    sec.pedirPista(PARTIDA);
    expect(sec.notas(compasInicio - 1e-6).every((n) => n.compas === 3)).toBe(true);
    expect(sec.nombre).toBe("inicio");
    const siguiente = sec.notas(compasInicio + 0.01);
    expect(sec.nombre).toBe("partida");
    expect(siguiente[0]!.compas).toBe(0);
    expect(siguiente[0]!.tiempo).toBeCloseTo(compasInicio, 9);
    expect(sec.duracionCompas).toBeCloseTo(CORCHEAS * segundosCorchea(PARTIDA.bpm), 9);
  });

  it("el pulso siguiente cae en una negra de la pista", () => {
    const negra = 60 / PARTIDA.bpm;
    const sec = new Secuenciador(PARTIDA, 2, 0);
    expect(sec.siguientePulso(2)).toBeCloseTo(2, 9);
    expect(sec.siguientePulso(2 + negra * 0.4)).toBeCloseTo(2 + negra, 9);
    expect(sec.siguientePulso(2 + negra * 2.9)).toBeCloseTo(2 + negra * 3, 9);
  });

  it("el contratiempo cae un poco tarde con el vaivén de la pista y el pulso, en su sitio", () => {
    const negra = 60 / PARTIDA.bpm;
    expect(momentoDe(PARTIDA, 0)).toBe(0);
    expect(momentoDe(PARTIDA, 2)).toBeCloseTo(negra, 9);
    expect(momentoDe(PARTIDA, 1)).toBeCloseTo(negra * PARTIDA.swing, 9);
    expect(PARTIDA.swing).toBeGreaterThan(0.5);
    expect(PARTIDA.swing).toBeLessThan(0.67);
  });
});
