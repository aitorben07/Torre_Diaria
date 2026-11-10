import { describe, expect, it } from "vitest";
import { registrarOficial } from "./diarios.ts";
import { cobrarLibre, sumarEstadisticas, type PartidaAcabada } from "./economia.ts";
import { registrarNivel } from "./niveles.ts";
import {
  CATALOGO_OBJETOS,
  comprarObjeto,
  desbloquear,
  gastarObjeto,
  MAX_OBJETO,
  objetoPorId,
  objetosNuevos,
  pagarSeguir,
  pagosSeguir,
  REGALO_DESBLOQUEO,
} from "./objetos.ts";
import { normalizar, progresoVacio, type Progreso } from "./progreso.ts";

const partida = (id: string): PartidaAcabada => ({ id, puntos: 10, piezas: 3, perfectos: 1, comboMax: 1, alturaMax: 2 });

/** Progreso tras `n` partidas libres terminadas. */
function tras(n: number, desde: Progreso = progresoVacio()): Progreso {
  let p = desde;
  for (let i = 0; i < n; i++) p = cobrarLibre(p, partida(`libre|${p.estadisticas.partidas}`)).progreso;
  return p;
}

const conTodo = (cambios: Partial<Progreso> = {}): Progreso => {
  const p = progresoVacio();
  return { ...p, ...cambios, objetos: { ...p.objetos, desbloqueados: ["reloj", "cemento", "corazon"], ...cambios.objetos } };
};

describe("desbloqueos y regalos (I2)", () => {
  it("con 1 partida no hay ninguno; con 2, el reloj con 2 unidades; con 4, el cemento; con 6, los tres", () => {
    expect(tras(1).objetos).toEqual({ reloj: 0, cemento: 0, corazon: 0, desbloqueados: [] });
    expect(tras(2).objetos).toEqual({ reloj: REGALO_DESBLOQUEO, cemento: 0, corazon: 0, desbloqueados: ["reloj"] });
    expect(tras(4).objetos.desbloqueados).toEqual(["reloj", "cemento"]);
    const seis = tras(6);
    expect(seis.objetos).toEqual({ reloj: 2, cemento: 2, corazon: 2, desbloqueados: ["reloj", "cemento", "corazon"] });
    expect(seis.estadisticas.partidas).toBe(6);
  });

  it("el regalo se da una sola vez: releer el progreso o seguir jugando no lo repite", () => {
    const dos = tras(2);
    const releido = normalizar(JSON.parse(JSON.stringify(dos)))!;
    expect(desbloquear(releido)).toBe(releido);
    expect(releido.objetos.reloj).toBe(2);
    expect(tras(1, releido).objetos.reloj).toBe(2);
    // Gastado el regalo, tampoco vuelve.
    const gastado = gastarObjeto(gastarObjeto(releido, "reloj"), "reloj");
    expect(tras(3, gastado).objetos.reloj).toBe(0);
  });

  it("el regalo no pasa del máximo", () => {
    const p = progresoVacio();
    const casiLleno: Progreso = { ...p, objetos: { ...p.objetos, reloj: 8 }, estadisticas: { ...p.estadisticas, partidas: 2 } };
    expect(desbloquear(casiLleno).objetos.reloj).toBe(MAX_OBJETO);
  });

  it("cuentan la libre, el oficial y el nivel; la repetición de un día jugado y la misma libre dos veces, no", () => {
    let p = cobrarLibre(progresoVacio(), partida("a")).progreso;
    p = cobrarLibre(p, partida("a")).progreso;
    expect(p.estadisticas.partidas).toBe(1);
    p = registrarOficial(p, 10, 10, { ...partida("oficial"), altura: 2, indices: [0, 1, 2] }).progreso;
    expect(p.estadisticas.partidas).toBe(2);
    expect(p.objetos.desbloqueados).toEqual(["reloj"]);
    const repetido = registrarOficial(p, 10, 10, { ...partida("repeticion"), altura: 2, indices: [0, 1, 2] });
    expect(repetido.nuevo).toBe(false);
    expect(repetido.progreso.estadisticas.partidas).toBe(2);
    p = sumarEstadisticas(registrarNivel(p, 1, 2).progreso, partida("nivel"));
    expect(p.estadisticas.partidas).toBe(3);
  });

  it("ganar el nivel 3 (o el 6 o el 9) por primera vez no regala objetos (impacto R-5)", () => {
    const p = progresoVacio();
    for (const nivel of [3, 6, 9]) expect(registrarNivel(p, nivel, 3).progreso.objetos).toEqual(p.objetos);
  });

  it("objetosNuevos dice los desbloqueados entre dos progresos, con su nombre", () => {
    const uno = tras(1);
    expect(objetosNuevos(uno, tras(1, uno)).map((o) => o.nombre)).toEqual(["Reloj de arena"]);
    expect(objetosNuevos(tras(2), tras(3))).toEqual([]);
    expect(objetosNuevos(progresoVacio(), tras(6)).map((o) => o.id)).toEqual(["reloj", "cemento", "corazon"]);
  });
});

describe("comprar y gastar (I2)", () => {
  it("con monedas insuficientes no cambia nada; con suficientes resta el precio exacto y suma 1", () => {
    for (const { id, precio } of CATALOGO_OBJETOS) {
      const pobre = conTodo({ monedas: precio - 1 });
      expect(comprarObjeto(pobre, id)).toBe(pobre);
      const rico = conTodo({ monedas: precio + 7 });
      const comprado = comprarObjeto(rico, id);
      expect(comprado.monedas).toBe(7);
      expect(comprado.objetos[id]).toBe(1);
    }
  });

  it("con 9 no compra", () => {
    const p = conTodo({ monedas: 10_000 });
    const lleno: Progreso = { ...p, objetos: { ...p.objetos, cemento: MAX_OBJETO } };
    expect(comprarObjeto(lleno, "cemento")).toBe(lleno);
  });

  it("un objeto aún bloqueado no se puede comprar", () => {
    const p = { ...progresoVacio(), monedas: 10_000 };
    expect(comprarObjeto(p, "reloj")).toBe(p);
  });

  it("gastar con 0 devuelve el mismo progreso; con 2, deja 1", () => {
    const p = conTodo();
    expect(gastarObjeto(p, "reloj")).toBe(p);
    const dos: Progreso = { ...p, objetos: { ...p.objetos, reloj: 2 } };
    expect(gastarObjeto(dos, "reloj").objetos.reloj).toBe(1);
  });

  it("precios del Anexo H y desbloqueo a las 2, 4 y 6 partidas", () => {
    expect(CATALOGO_OBJETOS.map((o) => [o.id, o.precio, o.partidas])).toEqual([
      ["reloj", 120, 2],
      ["cemento", 180, 4],
      ["corazon", 250, 6],
    ]);
    expect(objetoPorId("corazon").nombre).toBe("Corazón");
  });
});

describe("«¿Seguir?» (I3, impacto R-4)", () => {
  const conCorazon = (corazon: number, monedas: number, record: number): Progreso => {
    const p = conTodo({ monedas });
    return { ...p, objetos: { ...p.objetos, corazon }, libre: { ...p.libre, record } };
  };

  it("sin corazones, con 0 monedas y sin vídeo, no se ofrece", () => {
    expect(pagosSeguir(conCorazon(0, 0, 500), { modo: "libre", puntos: 400, video: false })).toEqual([]);
  });

  it("solo en la libre: ni en niveles ni en el reto diario", () => {
    for (const modo of ["nivel", "oficial", "repeticion"]) expect(pagosSeguir(conCorazon(3, 1000, 0), { modo, puntos: 100, video: true })).toEqual([]);
  });

  it("en la libre, solo con los puntos al 30 % del récord o más, o con récord 0", () => {
    const p = conCorazon(1, 0, 1000);
    expect(pagosSeguir(p, { modo: "libre", puntos: 299, video: false })).toEqual([]);
    expect(pagosSeguir(p, { modo: "libre", puntos: 300, video: false })).toEqual(["corazon"]);
    expect(pagosSeguir(conCorazon(1, 0, 0), { modo: "libre", puntos: 0, video: false })).toEqual(["corazon"]);
  });

  it("con monedas para un corazón se ofrece pagarlo; con el corazón aún bloqueado, no", () => {
    expect(pagosSeguir(conCorazon(0, 250, 0), { modo: "libre", puntos: 10, video: false })).toEqual(["monedas"]);
    const bloqueado = { ...progresoVacio(), monedas: 5000 };
    expect(pagosSeguir(bloqueado, { modo: "libre", puntos: 10, video: false })).toEqual([]);
    expect(pagosSeguir(bloqueado, { modo: "libre", puntos: 10, video: true })).toEqual(["video"]);
  });

  it("pagar con corazón gasta uno; con monedas resta 250; el vídeo no cuesta", () => {
    const p = conCorazon(2, 300, 0);
    expect(pagarSeguir(p, "corazon").objetos.corazon).toBe(1);
    expect(pagarSeguir(p, "monedas").monedas).toBe(50);
    expect(pagarSeguir(p, "monedas").objetos.corazon).toBe(2);
    expect(pagarSeguir(p, "video")).toBe(p);
    const pobre = conCorazon(0, 249, 0);
    expect(pagarSeguir(pobre, "monedas")).toBe(pobre);
    expect(pagarSeguir(pobre, "corazon")).toBe(pobre);
  });
});
