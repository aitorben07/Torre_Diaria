import { describe, expect, it } from "vitest";
import { abrir, aceptaEntrada, empezar, enInicio, ESPERA_FIN_MS, transicion, verResultado, type Contexto, type Flujo, type Panel } from "./flujo.ts";

const HOY = 16;
const contexto = (ahora: number, jugados: number[] = []): Contexto => ({ ahora, hoy: HOY, jugado: (dia) => jugados.includes(dia) });

describe("flujo de pantallas (B5)", () => {
  it("al abrir sin reto se ve la pantalla de inicio y no empieza ninguna partida (E1)", () => {
    expect(abrir(null, HOY)).toEqual({
      flujo: { pantalla: "inicio", modo: "libre", dia: HOY, nivel: 0, finDesde: -Infinity, debajo: null },
      orden: { tipo: "nada" },
    });
  });

  it("al abrir con el enlace de una partida libre se ve su aviso; jugarla usa su código (F2)", () => {
    const { flujo, orden } = abrir(null, HOY, { semilla: "a1b2c3", puntos: 300 });
    expect(flujo).toMatchObject({ pantalla: "reto", modo: "libre" });
    expect(orden).toEqual({ tipo: "reto" });
    expect(transicion(flujo, { tipo: "libre", codigo: "a1b2c3" }, contexto(0)).orden).toEqual({ tipo: "jugar", modo: "libre", dia: HOY, codigo: "a1b2c3" });
    // Con los dos enlaces, manda el reto.
    expect(abrir({ dia: 1, puntos: 5 }, HOY, { semilla: "a", puntos: 1 }).flujo.modo).toBe("oficial");
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

describe("paneles de Retos y Tienda (C3, D2)", () => {
  it("abrir un panel durante la partida libre la deja en pausa y cerrarlo la sigue", () => {
    const { flujo: panel, orden } = transicion(empezar("libre", HOY), { tipo: "abrir", panel: "tienda" }, contexto(0));
    expect(orden).toEqual({ tipo: "panel", panel: "tienda" });
    expect(panel).toMatchObject({ pantalla: "tienda", debajo: "jugando" });
    const cerrado = transicion(panel, { tipo: "cerrar" }, contexto(0));
    expect(cerrado.orden).toEqual({ tipo: "volver", pantalla: "jugando" });
    expect(cerrado.flujo).toEqual(empezar("libre", HOY));
  });

  it("de un panel a otro se vuelve a la pantalla de debajo", () => {
    const fin = verResultado(HOY);
    const retos = transicion(fin, { tipo: "abrir", panel: "retos" }, contexto(0)).flujo;
    const tienda = transicion(retos, { tipo: "abrir", panel: "tienda" }, contexto(0)).flujo;
    expect(tienda).toMatchObject({ pantalla: "tienda", debajo: "fin" });
    expect(transicion(tienda, { tipo: "cerrar" }, contexto(0)).orden).toEqual({ tipo: "volver", pantalla: "fin" });
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
    expect(panel.debajo).toBe("jugando");
    expect(transicion(panel, { tipo: "cerrar" }, contexto(0)).flujo).toEqual(empezar("nivel", HOY, 2));
  });

  it("la repetición de un día tampoco se puede dejar a medias", () => {
    const repeticion = empezar("repeticion", 3);
    expect(transicion(repeticion, { tipo: "abrir", panel: "niveles" }, contexto(0)).orden).toEqual({ tipo: "nada" });
  });
});

describe("inicio y pausa (E1, E3)", () => {
  const conNiveles = (ahora: number): Contexto => ({ ...contexto(ahora), nivelDisponible: (n) => n === 1 });
  const PANELES: Panel[] = ["retos", "niveles", "tienda", "ajustes"];

  it("desde el inicio, «Jugar» empieza la partida libre", () => {
    expect(transicion(enInicio(HOY), { tipo: "libre" }, contexto(0))).toEqual({
      flujo: empezar("libre", HOY),
      orden: { tipo: "jugar", modo: "libre", dia: HOY },
    });
  });

  it("desde el inicio se abre cada panel y al cerrarlo se vuelve al inicio", () => {
    for (const panel of PANELES) {
      const { flujo, orden } = transicion(enInicio(HOY), { tipo: "abrir", panel }, contexto(0));
      expect(orden).toEqual({ tipo: "panel", panel });
      expect(flujo).toMatchObject({ pantalla: panel, debajo: "inicio" });
      expect(transicion(flujo, { tipo: "cerrar" }, contexto(0))).toEqual({ flujo: enInicio(HOY), orden: { tipo: "volver", pantalla: "inicio" } });
      expect(transicion(flujo, { tipo: "inicio" }, contexto(0))).toEqual({ flujo: enInicio(HOY), orden: { tipo: "inicio" } });
    }
  });

  it("en libre y en nivel: pausar, seguir e ir al inicio desde la pausa", () => {
    for (const partida of [empezar("libre", HOY), empezar("nivel", HOY, 1)]) {
      const { flujo: pausa, orden } = transicion(partida, { tipo: "pausar" }, contexto(0));
      expect(orden).toEqual({ tipo: "pausa" });
      expect(pausa).toEqual({ ...partida, pantalla: "pausa" });
      expect(transicion(pausa, { tipo: "seguirPartida" }, contexto(0))).toEqual({ flujo: partida, orden: { tipo: "volver", pantalla: "jugando" } });
      expect(transicion(pausa, { tipo: "inicio" }, conNiveles(0))).toEqual({ flujo: enInicio(HOY), orden: { tipo: "inicio" } });
      // Ajustes encima de la pausa: al cerrar, vuelve a la pausa.
      const ajustes = transicion(pausa, { tipo: "abrir", panel: "ajustes" }, contexto(0)).flujo;
      expect(ajustes).toMatchObject({ pantalla: "ajustes", debajo: "pausa" });
      expect(transicion(ajustes, { tipo: "cerrar" }, contexto(0))).toEqual({ flujo: pausa, orden: { tipo: "volver", pantalla: "pausa" } });
    }
  });

  it("en el reto oficial y su repetición se pausa, pero desde la pausa solo se abren los Ajustes y no hay «Inicio» (R-3)", () => {
    for (const reto of [empezar("oficial", HOY), empezar("repeticion", 3)]) {
      const { flujo: pausa } = transicion(reto, { tipo: "pausar" }, contexto(0));
      expect(pausa.pantalla).toBe("pausa");
      for (const panel of ["retos", "niveles", "tienda"] as const) {
        expect(transicion(pausa, { tipo: "abrir", panel }, contexto(0))).toEqual({ flujo: pausa, orden: { tipo: "nada" } });
      }
      expect(transicion(pausa, { tipo: "inicio" }, contexto(0))).toEqual({ flujo: pausa, orden: { tipo: "nada" } });
      const ajustes = transicion(pausa, { tipo: "abrir", panel: "ajustes" }, contexto(0));
      expect(ajustes.orden).toEqual({ tipo: "panel", panel: "ajustes" });
      // Con los Ajustes encima, tampoco se sale al inicio ni se abre otro panel.
      expect(transicion(ajustes.flujo, { tipo: "inicio" }, contexto(0)).orden).toEqual({ tipo: "nada" });
      expect(transicion(ajustes.flujo, { tipo: "abrir", panel: "retos" }, contexto(0)).orden).toEqual({ tipo: "nada" });
      expect(transicion(ajustes.flujo, { tipo: "cerrar" }, contexto(0)).flujo).toEqual(pausa);
      expect(transicion(pausa, { tipo: "seguirPartida" }, contexto(0)).flujo).toEqual(reto);
    }
  });

  it("«Inicio» en el fin respeta los 700 ms y lleva al inicio", () => {
    const { flujo: fin } = transicion(empezar("libre", HOY), { tipo: "terminar" }, contexto(1000));
    expect(transicion(fin, { tipo: "inicio" }, contexto(1300)).orden).toEqual({ tipo: "nada" });
    expect(transicion(fin, { tipo: "inicio" }, contexto(1000 + ESPERA_FIN_MS))).toEqual({ flujo: enInicio(HOY), orden: { tipo: "inicio" } });
  });

  it("pausar, seguir e «Inicio» no hacen nada fuera de su sitio", () => {
    const casos: Array<[Flujo, "pausar" | "seguirPartida" | "inicio"]> = [
      [enInicio(HOY), "pausar"],
      [enInicio(HOY), "seguirPartida"],
      [enInicio(HOY), "inicio"],
      [empezar("libre", HOY), "seguirPartida"],
      [empezar("libre", HOY), "inicio"],
      [verResultado(HOY), "pausar"],
      [abrir({ dia: 1, puntos: 5 }, HOY).flujo, "inicio"],
    ];
    for (const [flujo, tipo] of casos) expect(transicion(flujo, { tipo }, contexto(0)), `${flujo.pantalla} + ${tipo}`).toEqual({ flujo, orden: { tipo: "nada" } });
  });
});

describe("«¿Seguir?» (I3, impacto R-4)", () => {
  it("en la libre, perder con qué pagar lleva a «¿Seguir?»; pagar sigue la partida y «No» la acaba", () => {
    const libre = empezar("libre", HOY);
    const { flujo: seguir, orden } = transicion(libre, { tipo: "ofrecerSeguir" }, contexto(0));
    expect(orden).toEqual({ tipo: "seguir" });
    expect(seguir).toEqual({ ...libre, pantalla: "seguir", finDesde: 0 });
    expect(transicion(seguir, { tipo: "seguirTrasPerder" }, contexto(ESPERA_FIN_MS))).toEqual({ flujo: libre, orden: { tipo: "volver", pantalla: "jugando" } });
    expect(transicion(seguir, { tipo: "terminar" }, contexto(5))).toEqual({ flujo: { ...libre, pantalla: "fin", finDesde: 5 }, orden: { tipo: "nada" } });
  });

  it("como el fin, «¿Seguir?» no acepta nada durante `ESPERA_FIN_MS`: la pulsación que traía el jugador no paga", () => {
    const seguir = transicion(empezar("libre", HOY), { tipo: "ofrecerSeguir" }, contexto(1000)).flujo;
    expect(aceptaEntrada(seguir, 1000)).toBe(false);
    expect(aceptaEntrada(seguir, 1000 + ESPERA_FIN_MS - 1)).toBe(false);
    expect(transicion(seguir, { tipo: "seguirTrasPerder" }, contexto(1000 + ESPERA_FIN_MS - 1))).toEqual({ flujo: seguir, orden: { tipo: "nada" } });
    expect(aceptaEntrada(seguir, 1000 + ESPERA_FIN_MS)).toBe(true);
  });

  it("en «¿Seguir?» no se pausa, no se abre ningún panel ni se va al inicio", () => {
    const seguir = transicion(empezar("libre", HOY), { tipo: "ofrecerSeguir" }, contexto(0)).flujo;
    for (const accion of [{ tipo: "pausar" }, { tipo: "inicio" }, { tipo: "abrir", panel: "ajustes" }, { tipo: "abrir", panel: "tienda" }, { tipo: "seguirPartida" }] as const) {
      expect(transicion(seguir, accion, contexto(0))).toEqual({ flujo: seguir, orden: { tipo: "nada" } });
    }
  });

  it("en los niveles y en el reto diario no se ofrece nunca", () => {
    for (const partida of [empezar("nivel", HOY, 1), empezar("oficial", HOY), empezar("repeticion", 3)]) {
      expect(transicion(partida, { tipo: "ofrecerSeguir" }, contexto(0))).toEqual({ flujo: partida, orden: { tipo: "nada" } });
    }
    // Y seguir sin haberlo ofrecido no hace nada.
    expect(transicion(empezar("libre", HOY), { tipo: "seguirTrasPerder" }, contexto(0)).orden).toEqual({ tipo: "nada" });
  });
});
