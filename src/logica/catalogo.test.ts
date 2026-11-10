import { describe, expect, it } from "vitest";
import {
  CATALOGO,
  comprar,
  equipado,
  equipar,
  ESCENARIOS,
  loTiene,
  nuevosEscenarios,
  PRECIO_CONGELADOR,
  siguienteDesbloqueoRacha,
  siguienteObjetivo,
  TEMAS,
} from "./catalogo.ts";
import { normalizar, progresoVacio, type Progreso } from "./progreso.ts";

const conMonedas = (monedas: number): Progreso => ({ ...progresoVacio(), monedas });
const conAltura = (alturaRecord: number): Progreso => {
  const p = progresoVacio();
  return { ...p, libre: { ...p.libre, alturaRecord } };
};
const conRacha = (mejor: number): Progreso => {
  const p = progresoVacio();
  return { ...p, racha: { ...p.racha, mejor } };
};

describe("catálogo (C3 con el recorte I1)", () => {
  it("tiene 6 temas, 3 escenarios y el congelador, sin ids repetidos", () => {
    expect(TEMAS).toHaveLength(6);
    expect(ESCENARIOS.map((e) => e.id)).toEqual(["puerto", "ciudad", "nubes"]);
    const ids = CATALOGO.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("precios ×1,5 sobre los de la v2: 14.520 monedas comprables en temas", () => {
    expect(TEMAS.map((t) => t.precio)).toEqual([0, 450, 1470, 2520, 3780, 6300]);
    expect(TEMAS.reduce((suma, t) => suma + t.precio, 0)).toBe(14520);
  });

  it("quien compró temas a los precios de antes los conserva: el guardado lleva la posesión, no el precio", () => {
    // Madera (300) y Oro (4.200) comprados antes del ×1,5; quedan 50 monedas, menos que cualquier precio nuevo.
    const guardado = JSON.parse(JSON.stringify({ ...conMonedas(50), catalogo: { comprados: ["madera", "oro"], equipado: { tema: "oro", escenario: "puerto" } } }));
    const p = normalizar(guardado)!;
    expect(p.monedas).toBe(50);
    expect(loTiene(p, "madera") && loTiene(p, "oro")).toBe(true);
    expect(equipado(p).tema).toBe("oro");
    expect(equipar(p, "madera").catalogo.equipado.tema).toBe("madera");
    expect(comprar(p, "oro")).toBe(p);
    expect(siguienteObjetivo(p)).toBe("Te faltan 1.420 monedas para Caramelo");
  });

  it("comprar sin monedas suficientes no cambia el progreso", () => {
    const p = conMonedas(449);
    expect(comprar(p, "madera")).toBe(p);
  });

  it("con monedas suficientes resta el precio exacto y lo añade a comprados; dos veces no resta dos veces", () => {
    const una = comprar(conMonedas(1000), "madera");
    expect(una.monedas).toBe(550);
    expect(una.catalogo.comprados).toEqual(["madera"]);
    expect(comprar(una, "madera")).toBe(una);
    expect(comprar(una, "riso")).toBe(una);
  });

  it("un escenario no se puede comprar", () => {
    const p = conMonedas(99_999);
    expect(comprar(p, "ciudad")).toBe(p);
    expect(comprar(p, "nada")).toBe(p);
  });

  it("un escenario se desbloquea al guardar una altura récord igual o mayor a su condición", () => {
    expect(loTiene(conAltura(24.9), "ciudad")).toBe(false);
    expect(loTiene(conAltura(25), "ciudad")).toBe(true);
    expect(loTiene(conAltura(25), "nubes")).toBe(false);
    expect(loTiene(conAltura(50), "nubes")).toBe(true);
    expect(loTiene(progresoVacio(), "puerto")).toBe(true);
  });

  it("una racha de 3 desbloquea Ciudad aunque la altura récord sea menor de 25 m, y una de 7 Nubes", () => {
    expect(loTiene(conRacha(3), "ciudad")).toBe(true);
    expect(loTiene(conRacha(3), "nubes")).toBe(false);
    expect(loTiene(conRacha(7), "nubes")).toBe(true);
  });

  it("solo se equipa lo que se tiene", () => {
    const p = progresoVacio();
    expect(equipar(p, "madera")).toBe(p);
    expect(equipar(p, "ciudad")).toBe(p);
    const comprado = equipar(comprar(conMonedas(450), "madera"), "madera");
    expect(comprado.catalogo.equipado).toEqual({ tema: "madera", escenario: "puerto" });
    expect(equipar(conRacha(3), "ciudad").catalogo.equipado.escenario).toBe("ciudad");
  });

  it("lo equipado que ya no se tiene vuelve a Riso y Puerto", () => {
    const p = progresoVacio();
    p.catalogo.equipado = { tema: "oro", escenario: "nubes" };
    expect(equipado(p)).toEqual({ tema: "riso", escenario: "puerto" });
  });

  it("el congelador cuesta 200 y no se pueden tener más de 2", () => {
    let p = comprar(conMonedas(250), "congelador");
    expect(p.monedas).toBe(250 - PRECIO_CONGELADOR);
    expect(p.racha.congeladores).toBe(1);
    p = { ...p, monedas: 1000, racha: { ...p.racha, congeladores: 2 } };
    expect(comprar(p, "congelador")).toBe(p);
  });

  it("avisa de los escenarios recién desbloqueados", () => {
    expect(nuevosEscenarios(conAltura(20), conAltura(26)).map((e) => e.id)).toEqual(["ciudad"]);
    expect(nuevosEscenarios(conAltura(26), conAltura(30))).toEqual([]);
  });

  it("el siguiente desbloqueo por racha es Ciudad y luego Nubes", () => {
    expect(siguienteDesbloqueoRacha(progresoVacio())?.nombre).toBe("Ciudad");
    expect(siguienteDesbloqueoRacha(conRacha(3))?.nombre).toBe("Nubes");
    expect(siguienteDesbloqueoRacha(conRacha(7))).toBeNull();
  });

  it("el siguiente objetivo es lo más cercano", () => {
    expect(siguienteObjetivo(conMonedas(180))).toBe("Te faltan 270 monedas para Madera");
    expect(siguienteObjetivo(conMonedas(450))).toBe("Ya puedes comprar el tema Madera");
    expect(siguienteObjetivo({ ...conAltura(22), monedas: 10 })).toBe("Llega a 25 m para la Ciudad");
    const todo = { ...conAltura(60), catalogo: { comprados: TEMAS.map((t) => t.id), equipado: { tema: "riso", escenario: "puerto" } } };
    expect(siguienteObjetivo(todo)).toBeNull();
  });
});
