import { describe, expect, it } from "vitest";
import { abrir, aceptaEntrada, empezar, ESPERA_FIN_MS, transicion, verResultado, type Contexto } from "./flujo.ts";

const HOY = 16;
const contexto = (ahora: number, jugadoHoy = false): Contexto => ({ ahora, hoy: HOY, jugadoHoy });

describe("flujo de pantallas (B5)", () => {
  it("al abrir sin reto, la partida libre ya está en marcha", () => {
    expect(abrir(null, HOY)).toEqual({
      flujo: { pantalla: "jugando", modo: "libre", dia: HOY, finDesde: -Infinity },
      orden: { tipo: "jugar", modo: "libre", dia: HOY },
    });
  });

  it("al abrir con un reto válido se ve su aviso y no empieza ninguna partida", () => {
    const { flujo, orden } = abrir({ dia: 1, puntos: 5 }, HOY);
    expect(flujo.pantalla).toBe("reto");
    expect(orden).toEqual({ tipo: "reto" });
  });

  it("durante los primeros 700 ms del fin se ignoran «Otra vez» y «Reto de hoy»", () => {
    const { flujo: fin } = transicion(empezar("libre", HOY), { tipo: "terminar" }, contexto(1000));
    expect(fin).toMatchObject({ pantalla: "fin", finDesde: 1000 });
    expect(aceptaEntrada(fin, 1300)).toBe(false);
    expect(transicion(fin, { tipo: "libre" }, contexto(1300))).toEqual({ flujo: fin, orden: { tipo: "nada" } });
    expect(transicion(fin, { tipo: "retoDeHoy" }, contexto(1000 + ESPERA_FIN_MS - 1)).orden).toEqual({ tipo: "nada" });
    expect(aceptaEntrada(fin, 1000 + ESPERA_FIN_MS)).toBe(true);
    expect(transicion(fin, { tipo: "libre" }, contexto(1800))).toEqual({
      flujo: empezar("libre", HOY),
      orden: { tipo: "jugar", modo: "libre", dia: HOY },
    });
  });

  it("«Reto de hoy» juega el oficial si no se ha jugado y, si ya se jugó, muestra el resultado", () => {
    const libre = empezar("libre", HOY);
    expect(transicion(libre, { tipo: "retoDeHoy" }, contexto(0)).orden).toEqual({ tipo: "jugar", modo: "oficial", dia: HOY });
    expect(transicion(libre, { tipo: "retoDeHoy" }, contexto(0, true))).toEqual({
      flujo: verResultado(HOY),
      orden: { tipo: "resultado", dia: HOY },
    });
  });

  it("un resultado guardado se puede dejar al momento, sin la espera del fin", () => {
    expect(transicion(verResultado(HOY), { tipo: "libre" }, contexto(0)).orden).toMatchObject({ tipo: "jugar", modo: "libre" });
  });

  it("el reto del amigo de otro día se juega sin guardar; el de hoy es el oficial", () => {
    const { flujo } = abrir({ dia: 3, puntos: 50 }, HOY);
    expect(transicion(flujo, { tipo: "jugarReto", reto: { dia: 3, puntos: 50 } }, contexto(0)).orden).toEqual({
      tipo: "jugar",
      modo: "reto",
      dia: 3,
    });
    const deHoy = { dia: HOY, puntos: 50 };
    expect(transicion(flujo, { tipo: "jugarReto", reto: deHoy }, contexto(0)).orden).toEqual({
      tipo: "jugar",
      modo: "oficial",
      dia: HOY,
    });
    expect(transicion(flujo, { tipo: "jugarReto", reto: deHoy }, contexto(0, true)).orden).toEqual({
      tipo: "resultado",
      dia: HOY,
    });
  });

  it("terminar solo tiene efecto durante una partida", () => {
    const fin = verResultado(HOY);
    expect(transicion(fin, { tipo: "terminar" }, contexto(5)).flujo).toBe(fin);
  });
});
