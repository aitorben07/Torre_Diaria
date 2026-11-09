import { describe, expect, it } from "vitest";
import { abrir, aceptaEntrada, empezar, enPausa, ESPERA_FIN_MS, transicion, verResultado, type Contexto } from "./flujo.ts";

const HOY = 16;
const contexto = (ahora: number, jugados: number[] = []): Contexto => ({ ahora, hoy: HOY, jugado: (dia) => jugados.includes(dia) });

describe("flujo de pantallas (B5)", () => {
  it("al abrir sin reto, la partida libre ya está en marcha", () => {
    expect(abrir(null, HOY)).toEqual({
      flujo: { pantalla: "jugando", modo: "libre", dia: HOY, nivel: 0, finDesde: -Infinity, debajo: null },
      orden: { tipo: "jugar", modo: "libre", dia: HOY },
    });
  });

  it("al abrir con un reto válido se ve su aviso y no empieza ninguna partida", () => {
    const { flujo, orden } = abrir({ dia: 1, puntos: 5 }, HOY);
    expect(flujo.pantalla).toBe("reto");
    expect(orden).toEqual({ tipo: "reto" });
  });

  it("durante los primeros 700 ms del fin se ignoran «Otra vez» y los demás botones", () => {
    const { flujo: fin } = transicion(empezar("libre", HOY), { tipo: "terminar" }, contexto(1000));
    expect(fin).toMatchObject({ pantalla: "fin", finDesde: 1000 });
    expect(aceptaEntrada(fin, 1300)).toBe(false);
    expect(transicion(fin, { tipo: "libre" }, contexto(1300))).toEqual({ flujo: fin, orden: { tipo: "nada" } });
    expect(transicion(fin, { tipo: "abrir", panel: "retos" }, contexto(1000 + ESPERA_FIN_MS - 1)).orden).toEqual({ tipo: "nada" });
    expect(aceptaEntrada(fin, 1000 + ESPERA_FIN_MS)).toBe(true);
    expect(transicion(fin, { tipo: "libre" }, contexto(1800))).toEqual({
      flujo: empezar("libre", HOY),
      orden: { tipo: "jugar", modo: "libre", dia: HOY },
    });
  });

  it("un resultado guardado se puede dejar al momento, sin la espera del fin", () => {
    expect(transicion(verResultado(HOY), { tipo: "libre" }, contexto(0)).orden).toMatchObject({ tipo: "jugar", modo: "libre" });
  });

  it("terminar solo tiene efecto durante una partida", () => {
    const fin = verResultado(HOY);
    expect(transicion(fin, { tipo: "terminar" }, contexto(5)).flujo).toBe(fin);
  });
});

describe("retos diarios (D1, D2 y D3)", () => {
  it("un día sin jugar se juega como oficial, de hoy o atrasado; jugado, se ve su resultado", () => {
    const libre = empezar("libre", HOY);
    expect(transicion(libre, { tipo: "jugarDia", dia: HOY }, contexto(0)).orden).toEqual({ tipo: "jugar", modo: "oficial", dia: HOY });
    expect(transicion(libre, { tipo: "jugarDia", dia: 3 }, contexto(0)).orden).toEqual({ tipo: "jugar", modo: "oficial", dia: 3 });
    expect(transicion(libre, { tipo: "jugarDia", dia: HOY }, contexto(0, [HOY]))).toEqual({
      flujo: verResultado(HOY),
      orden: { tipo: "resultado", dia: HOY },
    });
  });

  it("los días futuros y anteriores al 1 no se juegan", () => {
    const libre = empezar("libre", HOY);
    expect(transicion(libre, { tipo: "jugarDia", dia: HOY + 1 }, contexto(0)).orden).toEqual({ tipo: "nada" });
    expect(transicion(libre, { tipo: "jugarDia", dia: 0 }, contexto(0)).orden).toEqual({ tipo: "nada" });
  });

  it("solo se repite (sin contar) un día ya jugado", () => {
    const fin = verResultado(3);
    expect(transicion(fin, { tipo: "repetirDia", dia: 3 }, contexto(0, [3])).orden).toEqual({ tipo: "jugar", modo: "repeticion", dia: 3 });
    expect(transicion(fin, { tipo: "repetirDia", dia: 4 }, contexto(0, [3])).orden).toEqual({ tipo: "nada" });
  });

  it("el reto del amigo sin jugar es el intento oficial de ese día; jugado, su resultado", () => {
    const { flujo } = abrir({ dia: 3, puntos: 50 }, HOY);
    expect(transicion(flujo, { tipo: "jugarReto", reto: { dia: 3, puntos: 50 } }, contexto(0)).orden).toEqual({ tipo: "jugar", modo: "oficial", dia: 3 });
    const deHoy = { dia: HOY, puntos: 50 };
    expect(transicion(flujo, { tipo: "jugarReto", reto: deHoy }, contexto(0)).orden).toEqual({ tipo: "jugar", modo: "oficial", dia: HOY });
    expect(transicion(flujo, { tipo: "jugarReto", reto: deHoy }, contexto(0, [HOY])).orden).toEqual({ tipo: "resultado", dia: HOY });
  });
});

describe("paneles de Retos y Colección (C3, D2)", () => {
  it("abrir un panel durante la partida libre la deja en pausa y cerrarlo la sigue", () => {
    const { flujo: panel, orden } = transicion(empezar("libre", HOY), { tipo: "abrir", panel: "coleccion" }, contexto(0));
    expect(orden).toEqual({ tipo: "panel", panel: "coleccion" });
    expect(panel).toMatchObject({ pantalla: "coleccion", debajo: "jugando" });
    expect(enPausa(panel)).toBe(true);
    const cerrado = transicion(panel, { tipo: "cerrar" }, contexto(0));
    expect(cerrado.orden).toEqual({ tipo: "volver", pantalla: "jugando" });
    expect(cerrado.flujo).toEqual(empezar("libre", HOY));
  });

  it("de un panel a otro se vuelve a la pantalla de debajo", () => {
    const fin = verResultado(HOY);
    const retos = transicion(fin, { tipo: "abrir", panel: "retos" }, contexto(0)).flujo;
    const coleccion = transicion(retos, { tipo: "abrir", panel: "coleccion" }, contexto(0)).flujo;
    expect(coleccion).toMatchObject({ pantalla: "coleccion", debajo: "fin" });
    expect(transicion(coleccion, { tipo: "cerrar" }, contexto(0)).orden).toEqual({ tipo: "volver", pantalla: "fin" });
  });

  it("durante un reto diario no se abren paneles (no se puede dejar a medias)", () => {
    const oficial = empezar("oficial", HOY);
    expect(transicion(oficial, { tipo: "abrir", panel: "retos" }, contexto(0))).toEqual({ flujo: oficial, orden: { tipo: "nada" } });
  });

  it("desde Retos se juega un día y la partida en pausa se deja", () => {
    const retos = transicion(empezar("libre", HOY), { tipo: "abrir", panel: "retos" }, contexto(0)).flujo;
    const { flujo, orden } = transicion(retos, { tipo: "jugarDia", dia: HOY }, contexto(0));
    expect(orden).toEqual({ tipo: "jugar", modo: "oficial", dia: HOY });
    expect(flujo).toEqual(empezar("oficial", HOY));
  });

  it("cerrar sin panel abierto no hace nada", () => {
    const libre = empezar("libre", HOY);
    expect(transicion(libre, { tipo: "cerrar" }, contexto(0))).toEqual({ flujo: libre, orden: { tipo: "nada" } });
  });
});

describe("niveles (E3)", () => {
  const conNiveles = (ahora: number, disponibles: number[]): Contexto => ({ ...contexto(ahora), nivelDisponible: (n) => disponibles.includes(n) });

  it("solo se juega un nivel disponible", () => {
    const libre = empezar("libre", HOY);
    expect(transicion(libre, { tipo: "jugarNivel", nivel: 1 }, conNiveles(0, [1]))).toEqual({
      flujo: empezar("nivel", HOY, 1),
      orden: { tipo: "jugar", modo: "nivel", dia: HOY, nivel: 1 },
    });
    expect(transicion(libre, { tipo: "jugarNivel", nivel: 2 }, conNiveles(0, [1])).orden).toEqual({ tipo: "nada" });
    expect(transicion(libre, { tipo: "jugarNivel", nivel: 1 }, contexto(0)).orden).toEqual({ tipo: "nada" });
  });

  it("«Siguiente nivel» en el fin de un nivel juega el siguiente si ya está abierto", () => {
    const fin = transicion(empezar("nivel", HOY, 3), { tipo: "terminar" }, contexto(0)).flujo;
    expect(fin).toMatchObject({ pantalla: "fin", modo: "nivel", nivel: 3 });
    expect(transicion(fin, { tipo: "siguienteNivel" }, conNiveles(1000, [1, 2, 3, 4])).orden).toEqual({ tipo: "jugar", modo: "nivel", dia: HOY, nivel: 4 });
    expect(transicion(fin, { tipo: "siguienteNivel" }, conNiveles(1000, [1, 2, 3])).orden).toEqual({ tipo: "nada" });
    // Fuera del fin de un nivel no hace nada.
    expect(transicion(empezar("libre", HOY), { tipo: "siguienteNivel" }, conNiveles(0, [1, 2])).orden).toEqual({ tipo: "nada" });
  });

  it("un nivel en marcha se deja en pausa al abrir un panel, como la partida libre", () => {
    const { flujo: panel, orden } = transicion(empezar("nivel", HOY, 2), { tipo: "abrir", panel: "niveles" }, contexto(0));
    expect(orden).toEqual({ tipo: "panel", panel: "niveles" });
    expect(enPausa(panel)).toBe(true);
    expect(transicion(panel, { tipo: "cerrar" }, contexto(0)).flujo).toEqual(empezar("nivel", HOY, 2));
  });

  it("la repetición de un día tampoco se puede dejar a medias", () => {
    const repeticion = empezar("repeticion", 3);
    expect(transicion(repeticion, { tipo: "abrir", panel: "niveles" }, contexto(0)).orden).toEqual({ tipo: "nada" });
  });
});
