import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AMPLITUD, jugar, MAX_PASOS_ASENTAR, Partida, PLATAFORMA_MEDIO_ANCHO, posicionVaiven } from "./simulacion.ts";

const SEMILLA = "2026-11-05";

/** Toca cada pieza cuando su centro pasa sobre el centro de la torre (x = 0). */
function toquesCentrados(semilla: string, piezas: number): number[] {
  const partida = new Partida(semilla);
  const toques: number[] = [];
  while (!partida.terminada && toques.length < piezas && partida.pasos < 100_000) {
    const { colgada } = partida.estado();
    if (colgada && Math.abs(colgada.x) <= colgada.pieza.velocidad / 120 + 1e-9) {
      toques.push(partida.pasos);
      partida.soltar();
    }
    partida.paso();
  }
  return toques;
}

describe("posicionVaiven", () => {
  it("es una onda triangular que empieza en un extremo y pasa por el centro", () => {
    expect(posicionVaiven(0, 2, false)).toBe(-AMPLITUD);
    expect(posicionVaiven(0, 2, true)).toBe(AMPLITUD);
    // A 2 m/s recorre 2/60 m por paso: llega al otro extremo en 204 pasos.
    expect(posicionVaiven(204, 2, false)).toBeCloseTo(AMPLITUD, 9);
    expect(posicionVaiven(408, 2, false)).toBeCloseTo(-AMPLITUD, 9);
    expect(Math.abs(posicionVaiven(102, 2, false))).toBeLessThan(1e-9);
  });
});

describe("jugar", () => {
  it("tocar en cuanto aparece la primera pieza acaba la partida con 0 puntos", () => {
    const resultado = jugar(SEMILLA, [0]);
    expect(resultado.terminada).toBe(true);
    expect(resultado.puntos).toBe(0);
    expect(resultado.formas).toEqual([]);
  });

  it("tocar cada pieza sobre el centro de la torre da al menos 5 puntos sin acabar", () => {
    const toques = toquesCentrados(SEMILLA, 5);
    expect(toques).toHaveLength(5);
    const resultado = jugar(SEMILLA, toques);
    expect(resultado.puntos).toBeGreaterThanOrEqual(5);
    expect(resultado.terminada).toBe(false);
    expect(resultado.altura).toBeGreaterThan(2);
  });

  it("la misma semilla y los mismos toques dan el mismo resultado", () => {
    const toques = toquesCentrados(SEMILLA, 8);
    expect(jugar(SEMILLA, toques)).toEqual(jugar(SEMILLA, toques));
  });

  it("un toque durante la espera entre piezas no suelta nada", () => {
    const [primero] = toquesCentrados(SEMILLA, 1);
    const solo = jugar(SEMILLA, [primero!], 1000);
    const conEspera = jugar(SEMILLA, [primero!, primero! + 5, primero! + 15], 1000);
    expect(conEspera.posiciones).toHaveLength(1);
    expect(conEspera).toEqual(solo);
  });

  it("sin ningún toque no termina en 10.000 pasos y tiene 0 puntos", () => {
    const resultado = jugar(SEMILLA, [], 10_000);
    expect(resultado.pasos).toBe(10_000);
    expect(resultado.terminada).toBe(false);
    expect(resultado.puntos).toBe(0);
  });

  it("prueba dorada: una partida fija da siempre los mismos valores", () => {
    // Seis piezas centradas, un toque en espera (1180) que se ignora y una
    // séptima soltada en el extremo, que cae fuera y acaba la partida. Si se
    // actualiza planck o se cambia la física, esta prueba falla a propósito.
    // Actualizada a propósito al suavizar el inicio (D6, F1 de pruebas.md) y
    // al asentar las piezas antes de contar (F3): un paso más y la séptima
    // pieza algo más abajo; los puntos no cambian.
    const resultado = jugar(SEMILLA, [170, 375, 575, 772, 966, 1156, 1180, 1205]);
    const r6 = (valor: number) => Math.round(valor * 1e6) / 1e6;
    expect({
      puntos: resultado.puntos,
      altura: r6(resultado.altura),
      pasos: resultado.pasos,
      terminada: resultado.terminada,
      posiciones: resultado.posiciones.map((p) => ({ x: r6(p.x), y: r6(p.y), angulo: r6(p.angulo) })),
    }).toEqual({
      puntos: 6,
      altura: 3.547025,
      pasos: 1273,
      terminada: true,
      posiciones: [
        { x: 0.000001, y: 0.3996, angulo: 0.000032 },
        { x: 0.004046, y: 1.168798, angulo: 0.000125 },
        { x: 0.001764, y: 1.713106, angulo: 0.00019 },
        { x: 0.002673, y: 2.267608, angulo: 0.000193 },
        { x: 0.006782, y: 2.967146, angulo: 0.000172 },
        { x: -0.008157, y: 3.411891, angulo: 0.000161 },
        { x: -3.4, y: -0.268567, angulo: 0 },
      ],
    });
  });
});

describe("puntuación al acabar (F3 de pruebas.md)", () => {
  // Partida del día 2026-11-09 con 18 piezas: la última cae y la torre se
  // derrumba. Antes se contaban las piezas que seguían por encima de y = 0 en el
  // instante de la caída, aunque estuvieran cayendo, y marcaba 17.
  const SEMILLA_DERRUMBE = "2026-11-09";
  const TOQUES_DERRUMBE = [
    170, 378, 576, 773, 969, 1175, 1371, 1560, 1734, 1908, 2095, 2269, 2460, 2690, 2851, 3016, 3164, 3357,
  ];

  it("una torre derrumbada solo cuenta las piezas que quedan sobre la plataforma", () => {
    const resultado = jugar(SEMILLA_DERRUMBE, TOQUES_DERRUMBE);
    expect(resultado.terminada).toBe(true);
    expect(resultado.posiciones).toHaveLength(18);
    const sobre = resultado.posiciones.filter((p) => p.y > 0 && Math.abs(p.x) <= PLATAFORMA_MEDIO_ANCHO);
    expect(resultado.puntos).toBe(sobre.length);
    expect(resultado.formas).toHaveLength(resultado.puntos);
    expect(resultado.puntos).toBe(3);
  });

  it("tras la caída sigue simulando como mucho MAX_PASOS_ASENTAR pasos, sin piezas nuevas", () => {
    const partida = new Partida(SEMILLA_DERRUMBE);
    const pendientes = new Set(TOQUES_DERRUMBE);
    while (partida.fase !== "asentando" && partida.pasos < 10_000) {
      if (pendientes.has(partida.pasos)) partida.soltar();
      partida.paso();
    }
    const pasoCaida = partida.pasos;
    expect(partida.terminada).toBe(false);
    while (!partida.terminada) {
      expect(partida.soltar()).toBe(false);
      expect(partida.estado().colgada).toBeNull();
      partida.paso();
    }
    expect(partida.pasos - pasoCaida).toBeLessThanOrEqual(MAX_PASOS_ASENTAR);
    expect(partida.resultado()).toEqual(jugar(SEMILLA_DERRUMBE, TOQUES_DERRUMBE));
  });
});

describe("aislamiento de la física", () => {
  const raiz = new URL("../", import.meta.url);
  const archivos = (readdirSync(raiz, { recursive: true }) as string[])
    .map((ruta) => ruta.replaceAll("\\", "/"))
    .filter((ruta) => /\.(ts|astro)$/.test(ruta) && !ruta.endsWith(".test.ts"));

  it("solo simulacion.ts importa planck", () => {
    const conPlanck = archivos.filter((ruta) => /from\s+["']planck["']/.test(readFileSync(new URL(ruta, raiz), "utf8")));
    expect(conPlanck).toEqual(["logica/simulacion.ts"]);
  });

  it("ningún archivo de src/juego/, ni sus pruebas, menciona planck (T8)", () => {
    const deJuego = (readdirSync(raiz, { recursive: true }) as string[])
      .map((ruta) => ruta.replaceAll("\\", "/"))
      .filter((ruta) => ruta.startsWith("juego/") && /\.(ts|astro)$/.test(ruta));
    expect(deJuego.length).toBeGreaterThan(0);
    expect(deJuego.filter((ruta) => readFileSync(new URL(ruta, raiz), "utf8").includes("planck"))).toEqual([]);
  });

  it("simulacion.ts no usa reloj, azar ni trigonometría propia", () => {
    const codigo = readFileSync(new URL("logica/simulacion.ts", raiz), "utf8");
    for (const prohibido of ["Math.random", "Date.now", "performance.now", "Math.sin", "Math.cos"]) {
      expect(codigo).not.toContain(prohibido);
    }
  });
});
