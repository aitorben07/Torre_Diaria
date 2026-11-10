import { describe, expect, it } from "vitest";
import {
  actualizarRacha,
  cuadriculaMes,
  estadoDia,
  medallaDe,
  medallaDePuntos,
  mesVisible,
  rachaDeHoy,
  registrarOficial,
  sePuedeJugar,
  UMBRAL_BRONCE,
  UMBRAL_ORO,
  UMBRAL_PLATA,
  UMBRALES,
  type PartidaDiaria,
} from "./diarios.ts";
import { progresoVacio, type Progreso } from "./progreso.ts";
import { fechaUTC, numeroDia } from "./semilla.ts";
import { REGLAS } from "./simulacion.ts";

const partida = (puntos: number, id = "x"): PartidaDiaria => ({
  id,
  puntos,
  piezas: 20,
  perfectos: 5,
  comboMax: 3,
  alturaMax: 10.2,
  altura: 9.87654,
  indices: [0, 1, 2, 4, 5],
});

/** Juega el oficial de `dia` el día `hoy` y devuelve el progreso. */
function jugar(p: Progreso, dia: number, hoy: number, puntos = 100): Progreso {
  return registrarOficial(p, dia, hoy, partida(puntos)).progreso;
}

function conRacha5a7(congeladores = 0): Progreso {
  let p = progresoVacio();
  p = { ...p, racha: { ...p.racha, congeladores } };
  for (const dia of [5, 6, 7]) p = jugar(p, dia, dia);
  return p;
}

describe("racha (D1)", () => {
  it("oficiales en su día los días 5, 6 y 7: racha 3 el 7, 3 el 8 antes de jugar y 0 el 9 sin congeladores", () => {
    const p = conRacha5a7();
    expect(p.racha.actual).toBe(3);
    expect(p.racha.mejor).toBe(3);
    expect(rachaDeHoy(p, 7)).toBe(3);
    expect(rachaDeHoy(p, 8)).toBe(3);
    expect(rachaDeHoy(p, 9)).toBe(0);
    expect(actualizarRacha(p, 9).racha.actual).toBe(0);
    expect(actualizarRacha(p, 9).racha.mejor).toBe(3);
  });

  it("con 1 congelador, faltar el día 8 y jugar el 9 da racha 4 y 0 congeladores", () => {
    const p = jugar(actualizarRacha(conRacha5a7(1), 9), 9, 9);
    expect(p.racha.actual).toBe(4);
    expect(p.racha.congeladores).toBe(0);
    // Sin abrir antes (se juega directamente), da lo mismo.
    expect(jugar(conRacha5a7(1), 9, 9).racha).toEqual(p.racha);
  });

  it("faltar el 8 y el 9 con 1 congelador da racha 0 y guarda el congelador", () => {
    const p = actualizarRacha(conRacha5a7(1), 10);
    expect(p.racha.actual).toBe(0);
    expect(p.racha.congeladores).toBe(1);
    expect(jugar(p, 10, 10).racha.actual).toBe(1);
  });

  it("un atrasado (día 3 jugado el día 7) da medalla y monedas, enSuDia false, y no cambia la racha", () => {
    const antes = conRacha5a7();
    const { progreso, monedas, medalla } = registrarOficial(antes, 3, 7, partida(UMBRAL_PLATA));
    expect(medalla).toBe("plata");
    // 20 piezas + 5 perfectos + 2 hitos (10,2 m) = 35; plata 60 sin extra de racha.
    expect(monedas).toBe(35 + 60);
    expect(progreso.monedas).toBe(antes.monedas + 95);
    expect(progreso.diarios[3]?.enSuDia).toBe(false);
    expect(progreso.racha).toEqual(antes.racha);
  });

  it("dos doradas colocadas en el oficial suman 20 monedas (H2)", () => {
    const p = conRacha5a7();
    const sin = registrarOficial(p, 8, 8, partida(0)).monedas;
    const con = registrarOficial(p, 8, 8, { ...partida(0), doradas: 2 });
    expect(con.monedas).toBe(sin + 20);
    expect(con.progreso.monedas).toBe(p.monedas + sin + 20);
  });

  it("el oficial de hoy suma el extra de racha con la racha nueva", () => {
    const p = conRacha5a7();
    const { monedas } = registrarOficial(p, 8, 8, partida(0));
    // 35 de la partida + 15 sin medalla + 10 × 4 de racha.
    expect(monedas).toBe(35 + 15 + 40);
  });

  it("jugar otra vez un día ya jugado no cambia lo guardado ni suma monedas", () => {
    const p = conRacha5a7();
    const otra = registrarOficial(p, 7, 7, partida(UMBRAL_ORO));
    expect(otra.nuevo).toBe(false);
    expect(otra.monedas).toBe(0);
    expect(otra.progreso).toBe(p);
  });

  it("guarda los índices como tramos y la altura con 3 decimales", () => {
    const p = jugar(progresoVacio(), 4, 4);
    expect(p.diarios[4]).toEqual({ puntos: 100, piezas: 20, altura: 9.877, perfectos: 5, colocadas: "0-2,4-5", enSuDia: true, reglas: REGLAS });
  });

  it("los días futuros no se juegan ni se guardan", () => {
    expect(sePuedeJugar(8, 7)).toBe(false);
    expect(sePuedeJugar(0, 7)).toBe(false);
    expect(sePuedeJugar(7, 7)).toBe(true);
    expect(registrarOficial(progresoVacio(), 8, 7, partida(100)).nuevo).toBe(false);
  });
});

describe("medallas y estados (D1)", () => {
  it("las medallas van por puntos y los días de la v1 no tienen", () => {
    expect(medallaDePuntos(UMBRAL_BRONCE - 1)).toBeNull();
    expect(medallaDePuntos(UMBRAL_BRONCE)).toBe("bronce");
    expect(medallaDePuntos(UMBRAL_PLATA)).toBe("plata");
    expect(medallaDePuntos(UMBRAL_ORO + 5000)).toBe("oro");
    const v1 = { puntos: 0, piezas: 30, altura: 9, perfectos: 0, colocadas: "", enSuDia: true, reglas: 1 };
    expect(medallaDe(v1)).toBeNull();
    expect(medallaDe({ ...v1, puntos: UMBRAL_ORO, reglas: 2 })).toBe("oro");
  });

  it("los umbrales van redondeados a 50 y en orden, en cada versión de las reglas", () => {
    for (const umbrales of [UMBRALES[2]!, UMBRALES[3]!, { bronce: UMBRAL_BRONCE, plata: UMBRAL_PLATA, oro: UMBRAL_ORO }]) {
      for (const umbral of Object.values(umbrales)) expect(umbral % 50).toBe(0);
      expect(umbrales.bronce).toBeLessThan(umbrales.plata);
      expect(umbrales.plata).toBeLessThan(umbrales.oro);
    }
    expect(UMBRAL_ORO).toBe(UMBRALES[REGLAS]!.oro);
  });

  it("R16: un día de las reglas 2 conserva sus puntos y la medalla con los umbrales de la v2 (550, 2.400 y 4.000)", () => {
    expect(REGLAS).toBe(3);
    expect(UMBRALES[2]).toEqual({ bronce: 550, plata: 2400, oro: 4000 });
    const v2 = { puntos: 2400, piezas: 49, altura: 23.5, perfectos: 42, colocadas: "0-48", enSuDia: true, reglas: 2 };
    expect(medallaDe(v2)).toBe("plata");
    expect(medallaDe({ ...v2, puntos: 549 })).toBeNull();
    expect(medallaDe({ ...v2, puntos: 4000 })).toBe("oro");
    // Cada versión con los suyos, aunque cambien los de las reglas 3 (L1).
    expect(medallaDePuntos(2400, 2)).toBe("plata");
    expect(medallaDe({ ...v2, reglas: 3 })).toBe(medallaDePuntos(2400, 3));
  });

  it("L1: las reglas 3 tienen sus umbrales (450, 2.600 y 6.750) y 2.400 puntos dan plata con las 2 y bronce con las 3", () => {
    expect(UMBRALES[3]).toEqual({ bronce: 450, plata: 2600, oro: 6750 });
    expect(medallaDePuntos(2400, 2)).toBe("plata");
    expect(medallaDePuntos(2400, 3)).toBe("bronce");
    expect(medallaDePuntos(449, 3)).toBeNull();
    expect(medallaDePuntos(6750, 3)).toBe("oro");
  });

  it("R16: un día de las reglas 2 ya guardado no se vuelve a jugar como oficial ni cambia", () => {
    const v2 = { puntos: 2400, piezas: 49, altura: 23.5, perfectos: 42, colocadas: "0-48", enSuDia: true, reglas: 2 };
    const p: Progreso = { ...progresoVacio(), diarios: { 5: v2 } };
    const otra = registrarOficial(p, 5, 7, partida(UMBRAL_ORO));
    expect(otra.nuevo).toBe(false);
    expect(otra.progreso.diarios[5]).toEqual(v2);
    expect(estadoDia(p, 5, 7)).toBe("enSuDia");
  });

  it("cada día del calendario tiene su estado", () => {
    let p = jugar(progresoVacio(), 5, 5);
    p = jugar(p, 3, 6);
    expect(estadoDia(p, 0, 6)).toBe("antes");
    expect(estadoDia(p, 7, 6)).toBe("futuro");
    expect(estadoDia(p, 4, 6)).toBe("sinJugar");
    expect(estadoDia(p, 5, 6)).toBe("enSuDia");
    expect(estadoDia(p, 3, 6)).toBe("atrasado");
  });

  it("el día cambia a medianoche UTC", () => {
    expect(numeroDia(fechaUTC(new Date("2026-11-20T23:59:59Z")))).toBe(16);
    expect(numeroDia(fechaUTC(new Date("2026-11-21T00:00:00Z")))).toBe(17);
    // Una zona con desfase no cambia el día: se mira solo la hora UTC.
    expect(numeroDia(fechaUTC(new Date("2026-11-21T00:30:00+01:00")))).toBe(16);
  });
});

describe("calendario (D2)", () => {
  it("noviembre de 2026 empieza en domingo: seis huecos antes y el día 5 es el reto #1", () => {
    const casillas = cuadriculaMes(2026, 11);
    expect(casillas.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(casillas[6]).toEqual({ fecha: "2026-11-01", diaDelMes: 1, dia: -3 });
    expect(casillas.find((c) => c?.diaDelMes === 5)?.dia).toBe(1);
    expect(casillas.filter(Boolean)).toHaveLength(30);
  });

  it("se puede ir desde el mes de hoy hasta noviembre de 2026, y no más atrás", () => {
    // Día 40: 14 de diciembre de 2026.
    expect(mesVisible(40, 0)).toEqual({ anio: 2026, mes: 12, primero: false, ultimo: true });
    expect(mesVisible(40, -1)).toEqual({ anio: 2026, mes: 11, primero: true, ultimo: false });
    expect(mesVisible(40, -5)).toEqual({ anio: 2026, mes: 11, primero: true, ultimo: false });
    expect(mesVisible(60, 0)).toEqual({ anio: 2027, mes: 1, primero: false, ultimo: true });
    expect(mesVisible(60, -2)).toMatchObject({ anio: 2026, mes: 11, primero: true });
  });
});
