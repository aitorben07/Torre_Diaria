import { describe, expect, it } from "vitest";
import { PREMIO_ESTRELLA, PREMIO_MUNDO } from "./economia.ts";
import {
  estrellasDe,
  NIVELES,
  nivelDisponible,
  nivelPorNumero,
  opcionesDeNivel,
  registrarNivel,
  textoObjetivo,
  totalEstrellas,
  ultimoDisponible,
} from "./niveles.ts";
import { generarSecuencia, Secuencia } from "./piezas.ts";
import { progresoVacio, type Progreso } from "./progreso.ts";
import { evaluarObjetivo, jugar, Partida, type Evento } from "./simulacion.ts";

const conEstrellas = (niveles: Record<number, number>): Progreso => ({ ...progresoVacio(), niveles });

describe("tabla de niveles (E1)", () => {
  it("hay 10 niveles en un mundo, cada uno con objetivo válido, p2 < p3 y semilla distinta", () => {
    expect(NIVELES).toHaveLength(10);
    expect(new Set(NIVELES.map((n) => n.semilla)).size).toBe(10);
    for (const [i, nivel] of NIVELES.entries()) {
      expect(nivel.numero).toBe(i + 1);
      expect(nivel.semilla).toBe(`nivel-${i + 1}`);
      expect(nivel.p2).toBeGreaterThan(0);
      expect(nivel.p2).toBeLessThan(nivel.p3);
      expect(nivel.vidas).toBeGreaterThanOrEqual(1);
      expect(nivel.vidas).toBeLessThanOrEqual(3);
      const valores = Object.entries(nivel.objetivo).filter(([clave]) => clave !== "tipo").map(([, valor]) => valor);
      expect(valores.length).toBeGreaterThan(0);
      for (const valor of valores) expect(Number.isInteger(valor) && (valor as number) > 0).toBe(true);
    }
    expect(NIVELES.filter((n) => n.jefe).map((n) => n.numero)).toEqual([10]);
  });

  it("los objetivos parten del ejemplo del Anexo 1, 6, más largos desde el 4 (E2)", () => {
    expect(NIVELES.map((n) => textoObjetivo(n))).toEqual([
      "Coloca 5 piezas",
      "Llega a 3 m",
      "Haz 4 perfectos",
      "Coloca 12 piezas",
      "Haz un combo de 4",
      "Llega a 8 m con 2 vidas",
      "Coloca 12 piezas con 1 vida",
      "Consigue 600 puntos",
      "Llega a 10 m en 18 piezas",
      "Llega a 14 m con 2 vidas",
    ]);
  });

  it("el objetivo de cada nivel cabe en una frase de 40 caracteres como mucho (E3)", () => {
    for (const nivel of NIVELES) expect(textoObjetivo(nivel).length).toBeLessThanOrEqual(40);
    // Y con números grandes también.
    expect(textoObjetivo({ vidas: 1, objetivo: { tipo: "alturaConPiezas", metros: 100, piezas: 120 } }).length).toBeLessThanOrEqual(40);
  });

  it("sin opciones de nivel la secuencia es la de siempre; con ellas cambian las formas", () => {
    const deSiempre = generarSecuencia("2026-11-20", 50);
    const conDefecto = new Secuencia("2026-11-20", {});
    expect(deSiempre.map((_, i) => conDefecto.pieza(i))).toEqual(deSiempre);
    const faciles = new Secuencia("nivel-1", { formas: "faciles" });
    for (let i = 0; i < 200; i++) expect(["bloque", "tablon", "cuadrado"]).toContain(faciles.pieza(i).forma);
  });

  it("la velocidad del nivel es la de su primera pieza (B1 de la tercera versión)", () => {
    const partida = new Partida("nivel-1", { velocidad: 0.9, formas: "faciles" });
    expect(partida.estado().colgada!.velocidad).toBe(0.9);
  });
});

describe("objetivos de la partida (E1)", () => {
  const marca = { piezas: 0, altura: 0, perfectos: 0, combo: 0, puntos: 0 };

  it("cada tipo se cumple al llegar a su cifra", () => {
    expect(evaluarObjetivo({ tipo: "piezas", piezas: 5 }, { ...marca, piezas: 4 })).toBe("sigue");
    expect(evaluarObjetivo({ tipo: "piezas", piezas: 5 }, { ...marca, piezas: 5 })).toBe("cumplido");
    expect(evaluarObjetivo({ tipo: "altura", metros: 3 }, { ...marca, altura: 3.01 })).toBe("cumplido");
    expect(evaluarObjetivo({ tipo: "perfectos", perfectos: 2 }, { ...marca, perfectos: 1 })).toBe("sigue");
    expect(evaluarObjetivo({ tipo: "combo", combo: 3 }, { ...marca, combo: 3 })).toBe("cumplido");
    expect(evaluarObjetivo({ tipo: "puntos", puntos: 400 }, { ...marca, puntos: 399 })).toBe("sigue");
  });

  it("«8 m con como mucho 12 piezas» se pierde al colocar la 12 sin llegar", () => {
    const objetivo = { tipo: "alturaConPiezas", metros: 8, piezas: 12 } as const;
    expect(evaluarObjetivo(objetivo, { ...marca, piezas: 11, altura: 7 })).toBe("sigue");
    expect(evaluarObjetivo(objetivo, { ...marca, piezas: 12, altura: 7.9 })).toBe("fallado");
    expect(evaluarObjetivo(objetivo, { ...marca, piezas: 12, altura: 8 })).toBe("cumplido");
  });

  it("«coloca 5 piezas» acaba con victoria justo cuando la quinta cuenta como colocada", () => {
    const nivel = nivelPorNumero(1)!;
    const partida = new Partida(nivel.semilla, opcionesDeNivel(nivel));
    const eventos: Evento[] = [];
    while (!partida.terminada && partida.pasos < 20_000) {
      const { colgada, objetivo } = partida.estado();
      if (colgada && Math.abs(colgada.x - objetivo) < 0.3) partida.soltar();
      partida.paso();
      const nuevos = partida.tomarEventos();
      eventos.push(...nuevos);
      // Hasta la quinta, la partida sigue.
      if (eventos.filter((e) => e.tipo === "colocada").length < 5) expect(partida.terminada).toBe(false);
    }
    const colocadas = eventos.filter((e) => e.tipo === "colocada");
    expect(colocadas).toHaveLength(5);
    const fin = eventos.at(-1)!;
    expect(fin).toMatchObject({ tipo: "fin", victoria: true, paso: colocadas[4]!.paso });
    expect(partida.resultado()).toMatchObject({ victoria: true, piezas: 5, terminada: true });
  });

  it("sin vidas el nivel acaba sin victoria", () => {
    const nivel = nivelPorNumero(7)!;
    // Una sola vida y la primera pieza soltada en el extremo: cae y se acaba.
    const r = jugar(nivel.semilla, [0], { ...opcionesDeNivel(nivel), maxPasos: 5000 });
    expect(r).toMatchObject({ terminada: true, victoria: false, vidas: 0 });
  });

  it("prueba dorada del nivel 1: semilla, toques y resultado fijados", () => {
    // Tres perfectos y dos buenos (a 0,2 m) con la tabla de E1; si cambian la
    // física, las piezas o las reglas, falla a propósito (como las doradas de
    // B). Con REGLAS = 3 (tercera-version, B1: AMPLITUD 2,6 y HUECO_COLGADA
    // 1,8; el nivel sigue a 0,9 m/s) cambian los toques, los pasos y la
    // altura; antes: toques 224 a 1234, 1302 pasos y 4,109107 m.
    const nivel = nivelPorNumero(1)!;
    const r = jugar(nivel.semilla, [173, 377, 580, 767, 996], opcionesDeNivel(nivel));
    expect({ puntos: r.puntos, piezas: r.piezas, perfectos: r.perfectos, comboMax: r.comboMax, pasos: r.pasos, victoria: r.victoria }).toEqual({
      puntos: 120,
      piezas: 5,
      perfectos: 3,
      comboMax: 3,
      pasos: 1116,
      victoria: true,
    });
    expect(r.altura).toBeCloseTo(3.678103, 6);
  });
});

describe("estrellas, desbloqueo y premios (E1)", () => {
  const nivel = nivelPorNumero(4)!;

  it("1 estrella al cumplir, 2 con p2 puntos y 3 con p3; sin cumplir, ninguna", () => {
    expect(estrellasDe(nivel, { victoria: false, puntos: 99_999 })).toBe(0);
    expect(estrellasDe(nivel, { victoria: true, puntos: nivel.p2 - 1 })).toBe(1);
    expect(estrellasDe(nivel, { victoria: true, puntos: nivel.p2 })).toBe(2);
    expect(estrellasDe(nivel, { victoria: true, puntos: nivel.p3 })).toBe(3);
  });

  it("con progreso nuevo solo está el nivel 1; el n+1 se abre al completar el n", () => {
    const nuevo = progresoVacio();
    expect(NIVELES.filter((n) => nivelDisponible(nuevo, n.numero)).map((n) => n.numero)).toEqual([1]);
    expect(ultimoDisponible(nuevo)).toBe(1);
    const conTres = conEstrellas({ 1: 1, 2: 3, 3: 2 });
    expect(nivelDisponible(conTres, 4)).toBe(true);
    expect(nivelDisponible(conTres, 5)).toBe(false);
    expect(ultimoDisponible(conTres)).toBe(4);
    expect(nivelDisponible(conTres, 11)).toBe(false);
    expect(nivelDisponible(conTres, 0)).toBe(false);
  });

  it("mejorar de 1 a 3 estrellas da el premio de 2 estrellas nuevas, y repetir con 3 no da nada", () => {
    const primera = registrarNivel({ ...progresoVacio(), monedas: 10 }, 4, 1);
    expect(primera).toMatchObject({ nuevas: 1, monedas: PREMIO_ESTRELLA });
    expect(primera.progreso.monedas).toBe(10 + PREMIO_ESTRELLA);
    const mejor = registrarNivel(primera.progreso, 4, 3);
    expect(mejor).toMatchObject({ nuevas: 2, monedas: 2 * PREMIO_ESTRELLA });
    expect(mejor.progreso.niveles[4]).toBe(3);
    const repetir = registrarNivel(mejor.progreso, 4, 3);
    expect(repetir).toMatchObject({ nuevas: 0, monedas: 0 });
    expect(repetir.progreso).toBe(mejor.progreso);
    // Peor que la mejor marca: tampoco cambia nada.
    expect(registrarNivel(mejor.progreso, 4, 1).progreso).toBe(mejor.progreso);
  });

  it("los 10 niveles con 3 estrellas dan +200 una sola vez", () => {
    const casi = conEstrellas(Object.fromEntries(NIVELES.map((n) => [n.numero, n.numero === 10 ? 2 : 3])));
    const completo = registrarNivel(casi, 10, 3);
    expect(completo).toMatchObject({ nuevas: 1, mundoCompletado: true, monedas: PREMIO_ESTRELLA + PREMIO_MUNDO });
    expect(totalEstrellas(completo.progreso)).toBe(30);
    expect(registrarNivel(completo.progreso, 10, 3).monedas).toBe(0);
  });

  it("no guarda niveles que no existen", () => {
    const p = progresoVacio();
    expect(registrarNivel(p, 11, 3).progreso).toBe(p);
  });
});
