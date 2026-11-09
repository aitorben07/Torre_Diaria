import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { especialDe, MONEDAS_DORADA } from "./especiales.ts";
import { puntosDeColocada, TOLERANCIA_PERFECTO } from "./puntuacion.ts";
import { RELOJ_MULT } from "./ritmo.ts";
import {
  AMPLITUD,
  jugar,
  LIMITE_X,
  MAX_DINAMICAS,
  objetivoDe,
  PASO,
  Partida,
  PLATAFORMA_MEDIO_ANCHO,
  posicionVaiven,
  REGLAS,
  RELOJ_PIEZAS,
  type Ayuda,
  type Evento,
  type OpcionesPartida,
} from "./simulacion.ts";

const SEMILLA = "2026-11-05";

/** ¿La pieza que cuelga pasa en este paso por el objetivo (lo más cerca posible)? */
function sobreObjetivo(partida: Partida): boolean {
  const { colgada, objetivo } = partida.estado();
  return colgada !== null && Math.abs(colgada.x - objetivo) <= colgada.velocidad / 120 + 1e-9;
}

/** ¿La pieza que cuelga acaba de aparecer en un extremo del vaivén (fuera de la plataforma)? */
function enElExtremo(partida: Partida): boolean {
  const { colgada } = partida.estado();
  return colgada !== null && Math.abs(Math.abs(colgada.x) - AMPLITUD) < 1e-9;
}

/**
 * Juega soltando cada pieza cuando `tocar` lo dice, hasta `piezas` soltadas o
 * hasta acabar, y devuelve los toques y todos los eventos.
 */
function jugarCon(
  tocar: (partida: Partida, soltadas: number) => boolean,
  piezas: number,
  opciones: OpcionesPartida = {},
  semilla: string = SEMILLA,
): { partida: Partida; toques: number[]; eventos: Evento[] } {
  const partida = new Partida(semilla, opciones);
  const toques: number[] = [];
  const eventos: Evento[] = [];
  while (!partida.terminada && toques.length < piezas && partida.pasos < 200_000) {
    if (tocar(partida, toques.length)) {
      toques.push(partida.pasos);
      partida.soltar();
    }
    partida.paso();
    eventos.push(...partida.tomarEventos());
  }
  return { partida, toques, eventos };
}

/** Sigue la partida sin tocar `pasos` pasos (o hasta acabar) y añade los eventos. */
function seguir(partida: Partida, pasos: number, eventos: Evento[] = []): Evento[] {
  for (let i = 0; i < pasos && !partida.terminada; i++) {
    partida.paso();
    eventos.push(...partida.tomarEventos());
  }
  return eventos;
}

describe("posicionVaiven", () => {
  it("es una onda triangular que empieza en un extremo y pasa por el centro", () => {
    // Recibe la distancia recorrida desde que aparece (I1): a 2 m/s, 156 pasos son 5,2 m.
    const tras = (pasos: number) => pasos * 2 * PASO;
    expect(posicionVaiven(0, false)).toBe(-AMPLITUD);
    expect(posicionVaiven(0, true)).toBe(AMPLITUD);
    // Con AMPLITUD 2,6 llega al otro extremo en 156 pasos.
    expect(AMPLITUD).toBe(2.6);
    expect(posicionVaiven(tras(156), false)).toBeCloseTo(AMPLITUD, 9);
    expect(posicionVaiven(tras(312), false)).toBeCloseTo(-AMPLITUD, 9);
    expect(Math.abs(posicionVaiven(tras(78), false))).toBeLessThan(1e-9);
  });
});

describe("objetivoDe", () => {
  it("es la x de la pieza con la cima más alta; en empate, la última soltada; 0 sin piezas", () => {
    expect(objetivoDe([])).toBe(0);
    expect(objetivoDe([{ x: 0.3, cima: 1 }, { x: -0.2, cima: 2 }, { x: 0.5, cima: 1.5 }])).toBe(-0.2);
    expect(objetivoDe([{ x: 0.3, cima: 2 }, { x: -0.4, cima: 2 }])).toBe(-0.4);
  });
});

describe("vidas y episodios de caída (B1)", () => {
  it("con 3 vidas, tres piezas soltadas en el extremo acaban la partida con 0 puntos", () => {
    const fases: string[] = [];
    const { partida, eventos } = jugarCon((p) => {
      if (enElExtremo(p)) {
        fases.push(p.fase);
        return true;
      }
      return false;
    }, 10);
    seguir(partida, 1000, eventos);
    // Tras la primera y la segunda caída vuelve a «apuntando» con la pieza siguiente.
    expect(fases).toEqual(["apuntando", "apuntando", "apuntando"]);
    expect(eventos.filter((e) => e.tipo === "caida")).toMatchObject([{ vidas: 2 }, { vidas: 1 }, { vidas: 0 }]);
    expect(eventos.at(-1)).toMatchObject({ tipo: "fin", puntos: 0 });
    const resultado = partida.resultado();
    expect(resultado).toMatchObject({ terminada: true, puntos: 0, piezas: 0, vidas: 0 });
  });

  it("con vidas: 1 la partida acaba en la primera caída, como en la v1", () => {
    const resultado = jugar(SEMILLA, [0], { vidas: 1 });
    expect(resultado).toMatchObject({ terminada: true, puntos: 0, vidas: 0, formas: [] });
  });

  it("tras un episodio de caída no queda ninguna pieza por debajo de y = 0 ni fuera de LIMITE_X", () => {
    // Tres piezas sobre el objetivo y la cuarta en el extremo, que cae.
    const { partida, eventos } = jugarCon((p, n) => (n < 3 ? sobreObjetivo(p) : enElExtremo(p)), 4);
    seguir(partida, 400, eventos);
    expect(eventos.filter((e) => e.tipo === "caida")).toEqual([expect.objectContaining({ vidas: 2, perdidas: 1 })]);
    const { cuerpos, fase } = partida.estado();
    expect(fase).toBe("apuntando");
    expect(cuerpos).toHaveLength(3);
    for (const cuerpo of cuerpos) {
      expect(cuerpo.y).toBeGreaterThanOrEqual(0);
      expect(Math.abs(cuerpo.x)).toBeLessThanOrEqual(LIMITE_X);
    }
  });

  it("si caen varias piezas en el mismo episodio se resta una sola vida", () => {
    // Novato simulado del día 1 (scripts/duracion.ts) con las reglas 3: la
    // cuarta pieza tira también la tercera.
    const partida = new Partida(SEMILLA);
    const toques = new Set([131, 284, 435, 605]);
    const eventos: Evento[] = [];
    while (partida.pasos < 900 && !partida.terminada) {
      if (toques.has(partida.pasos)) partida.soltar();
      partida.paso();
      eventos.push(...partida.tomarEventos());
    }
    const caidas = eventos.filter((e) => e.tipo === "caida");
    expect(caidas).toEqual([{ tipo: "caida", paso: 783, vidas: 2, perdidas: 2 }]);
    expect(partida.estado().vidas).toBe(2);
  });

  it("un derrumbe que sigue resbalando tras MAX_PASOS_ASENTAR cuesta una sola vida", () => {
    // Novato simulado del día 22 con las reglas 3: su primer episodio se
    // cierra por tiempo con piezas aún sobre y = 0 pero fuera de la plataforma
    // y bajando deprisa. (Con las reglas 2 era el segundo episodio del día 1.)
    const toques = [113, 263, 408, 573, 713, 894, 1042, 1226, 1373, 1537, 1689, 1856, 2003, 2231];
    const partida = new Partida("2026-11-26");
    const pendientes = new Set(toques);
    const eventos: Evento[] = [];
    while (partida.pasos < 2554 && !partida.terminada) {
      if (pendientes.has(partida.pasos)) partida.soltar();
      partida.paso();
      eventos.push(...partida.tomarEventos());
    }
    const resbalando = partida.estado().cuerpos.filter((c) => c.y >= 0 && Math.abs(c.x) > PLATAFORMA_MEDIO_ANCHO);
    expect(partida.fase).toBe("asentando");
    expect(resbalando.length).toBeGreaterThan(0);
    seguir(partida, 1200, eventos);
    expect(eventos.filter((e) => e.tipo === "caida")).toEqual([expect.objectContaining({ paso: 2555, vidas: 2, perdidas: 12 })]);
    expect(partida.terminada).toBe(false);
    expect(partida.estado().cuerpos.every((c) => c.y > 0 && Math.abs(c.x) <= PLATAFORMA_MEDIO_ANCHO)).toBe(true);
  });
});

describe("jugar", () => {
  it("tocar cada pieza sobre el objetivo da 5 piezas colocadas, todas perfectas, sin acabar", () => {
    const { toques } = jugarCon(sobreObjetivo, 5);
    expect(toques).toHaveLength(5);
    const resultado = jugar(SEMILLA, toques);
    expect(resultado).toMatchObject({ piezas: 5, perfectos: 5, comboMax: 5, vidas: 3, terminada: false });
    expect(resultado.puntos).toBe(20 + 30 + 40 + 50 + 60);
    expect(resultado.altura).toBeGreaterThan(2);
    expect(resultado.formas).toHaveLength(5);
    for (const forma of resultado.formas) expect(forma.ancho).toBeGreaterThan(0);
  });

  it("la misma semilla, toques y opciones dan el mismo resultado y los mismos eventos", () => {
    const opciones = { vidas: 2 };
    const a = jugarCon((p, n) => (n % 3 === 2 ? enElExtremo(p) : sobreObjetivo(p)), 8, opciones);
    const b = jugarCon((p, n) => (n % 3 === 2 ? enElExtremo(p) : sobreObjetivo(p)), 8, opciones);
    seguir(a.partida, 600, a.eventos);
    seguir(b.partida, 600, b.eventos);
    expect(a.toques).toEqual(b.toques);
    expect(a.eventos).toEqual(b.eventos);
    expect(a.eventos.length).toBeGreaterThan(5);
    expect(jugar(SEMILLA, a.toques, opciones)).toEqual(jugar(SEMILLA, b.toques, opciones));
  });

  it("un toque durante la espera entre piezas no suelta nada", () => {
    const [primero] = jugarCon(sobreObjetivo, 1).toques;
    const solo = jugar(SEMILLA, [primero!], { maxPasos: 1000 });
    const conEspera = jugar(SEMILLA, [primero!, primero! + 5, primero! + 15], { maxPasos: 1000 });
    expect(conEspera.posiciones).toHaveLength(1);
    expect(conEspera).toEqual(solo);
  });

  it("sin ningún toque no termina en 10.000 pasos y tiene 0 puntos", () => {
    const resultado = jugar(SEMILLA, [], { maxPasos: 10_000 });
    expect(resultado.pasos).toBe(10_000);
    expect(resultado.terminada).toBe(false);
    expect(resultado.puntos).toBe(0);
  });

  it(`prueba dorada de las reglas ${REGLAS}: una partida fija da siempre los mismos valores`, () => {
    // Seis piezas sobre el objetivo (seis perfectos con imán), un toque en
    // espera (1378) que se ignora y tres piezas en el extremo, que caen y
    // gastan las tres vidas. Si se actualiza planck o se cambian la física o
    // las reglas, esta prueba falla a propósito. Nueva con REGLAS = 3
    // (tercera-version, B1): velocidad por ritmo desde 1,3 m/s, AMPLITUD 2,6 y
    // HUECO_COLGADA 1,8. Sustituye a la de las reglas 2 (toques 204 a 1560;
    // 260 puntos, 1631 pasos, altura 3,91307), que a su vez sustituyó a la
    // de la v1 (6 puntos, 1273 pasos). Mismos puntos: seis perfectos.
    expect(REGLAS).toBe(3);
    const resultado = jugar(SEMILLA, [120, 273, 426, 579, 732, 878, 888, 925, 995, 1062]);
    const r6 = (valor: number) => Math.round(valor * 1e6) / 1e6;
    expect({
      puntos: resultado.puntos,
      piezas: resultado.piezas,
      perfectos: resultado.perfectos,
      vidas: resultado.vidas,
      pasos: resultado.pasos,
      terminada: resultado.terminada,
      altura: r6(resultado.altura),
      posiciones: resultado.posiciones.map((p) => ({ x: r6(p.x), y: r6(p.y), angulo: r6(p.angulo) })),
    }).toEqual({
      puntos: 260,
      piezas: 6,
      perfectos: 6,
      vidas: 0,
      pasos: 1129,
      terminada: true,
      altura: 3.880425,
      posiciones: [
        { x: 0.000276, y: 0.396649, angulo: 0.000238 },
        { x: -0.000842, y: 1.159786, angulo: 0.00051 },
        { x: 0.000493, y: 1.698598, angulo: 0.000375 },
        { x: -0.000185, y: 2.248757, angulo: 0.00035 },
        { x: 0.000339, y: 2.943719, angulo: 0.000025 },
        { x: 0.000109, y: 3.565284, angulo: 0.0003 },
      ],
    });
  });
});

describe("precisión, imán y combo (B2)", () => {
  it("soltar al pasar por el objetivo da perfecto y la pieza nace justo en el objetivo", () => {
    const { partida } = jugarCon(sobreObjetivo, 1);
    seguir(partida, 300);
    // Segunda pieza: el objetivo es la x de la primera, que no es exactamente 0.
    while (!sobreObjetivo(partida) && !partida.terminada) seguir(partida, 1);
    const { objetivo, colgada } = partida.estado();
    expect(objetivo).not.toBe(0);
    expect(colgada!.x).not.toBe(objetivo);
    partida.soltar();
    const [soltada] = partida.tomarEventos();
    expect(soltada).toMatchObject({ tipo: "soltada", calidad: "perfecto", x: objetivo });
    expect(partida.estado().cuerpos.at(-1)!.x - objetivo).toBe(0);
  });

  it("soltar a 0,20 m del objetivo da bueno, no mueve la pieza y deja el combo a 0", () => {
    const { partida } = jugarCon(sobreObjetivo, 1);
    seguir(partida, 300);
    expect(partida.estado().combo).toBe(1);
    const cerca = () => {
      const { colgada, objetivo } = partida.estado();
      return colgada !== null && Math.abs(Math.abs(colgada.x - objetivo) - 0.2) <= colgada.velocidad / 120;
    };
    while (!cerca() && !partida.terminada) seguir(partida, 1);
    const { colgada, objetivo } = partida.estado();
    expect(Math.abs(colgada!.x - objetivo)).toBeGreaterThan(TOLERANCIA_PERFECTO);
    partida.soltar();
    expect(partida.tomarEventos()).toEqual([expect.objectContaining({ tipo: "soltada", calidad: "bueno", x: colgada!.x })]);
    expect(partida.estado().cuerpos.at(-1)!.x).toBe(colgada!.x);
    const eventos = seguir(partida, 300);
    expect(eventos.find((e) => e.tipo === "colocada")).toMatchObject({ calidad: "bueno", combo: 0, puntos: 15 });
    expect(partida.estado().combo).toBe(0);
  });

  it("con 2 vidas, 5 perfectos seguidos dan una vida extra; con 3 vidas no se pasa de 3", () => {
    for (const vidas of [2, 3]) {
      const { partida, eventos } = jugarCon(sobreObjetivo, 5, { vidas });
      seguir(partida, 300, eventos);
      expect(eventos.filter((e) => e.tipo === "colocada")).toHaveLength(5);
      expect(eventos.filter((e) => e.tipo === "vidaExtra")).toEqual(vidas === 2 ? [expect.objectContaining({ vidas: 3 })] : []);
      expect(partida.estado().vidas).toBe(3);
    }
  });

  it("la pieza en espera cuando cae algo no puntúa", () => {
    // Tres perfectos y la cuarta en el extremo: solo puntúan las tres primeras.
    const { partida, eventos } = jugarCon((p, n) => (n < 3 ? sobreObjetivo(p) : enElExtremo(p)), 4);
    seguir(partida, 400, eventos);
    expect(eventos.filter((e) => e.tipo === "colocada").map((e) => e.indice)).toEqual([0, 1, 2]);
    expect(partida.resultado()).toMatchObject({ piezas: 3, puntos: 20 + 30 + 40 });
    expect(partida.estado().combo).toBe(0);
  });

  it("los hitos de 5 m llegan como eventos y suman 50 puntos y 5 monedas", () => {
    const { partida, eventos } = jugarCon(sobreObjetivo, 12);
    seguir(partida, 300, eventos);
    const hitos = eventos.filter((e) => e.tipo === "hito");
    expect(hitos.map((e) => e.metros)).toEqual([5]);
    const { piezas, perfectos, monedas, alturaMax, doradas } = partida.resultado();
    expect(alturaMax).toBeGreaterThanOrEqual(5);
    // La pieza 11 del día 1 es dorada (H2): +10 monedas.
    expect(doradas).toBe(1);
    expect(monedas).toBe(piezas + perfectos + 5 + MONEDAS_DORADA);
  });
});

/** Juega `toques` y sigue `despues` pasos tras el último; devuelve la partida y todos los eventos. */
function reproducir(semilla: string, toques: number[], despues: number, opciones: OpcionesPartida = {}): { partida: Partida; eventos: Evento[] } {
  const partida = new Partida(semilla, opciones);
  const pendientes = new Set(toques);
  const eventos: Evento[] = [];
  while (!partida.terminada && partida.pasos <= Math.max(...toques) + despues) {
    if (pendientes.has(partida.pasos)) partida.soltar();
    partida.paso();
    eventos.push(...partida.tomarEventos());
  }
  return { partida, eventos };
}

describe("piezas especiales en la simulación (H2)", () => {
  // Día 1: la pieza 11 es dorada. Perfectos hasta la 9, un bueno en la 10
  // (combo a 0) y la dorada con un perfecto de combo 1 (toques buscados con
  // `jugarCon` y fijados).
  const TOQUES_DORADA = [120, 273, 426, 579, 732, 878, 1024, 1170, 1313, 1461, 1603, 1806];

  it("dorada colocada con un perfecto de combo 1: el doble de puntos de colocada y 10 monedas más", () => {
    expect(especialDe(SEMILLA, 11)).toBe("dorada");
    const { eventos } = reproducir(SEMILLA, TOQUES_DORADA, 300);
    expect(eventos.find((e) => e.tipo === "colocada" && e.indice === 11)).toMatchObject({ calidad: "perfecto", combo: 1, puntos: 2 * puntosDeColocada("perfecto", 1) });
    expect(eventos.filter((e) => e.tipo === "especial")).toEqual([{ tipo: "especial", paso: 1926, especial: "dorada", indice: 11, efecto: MONEDAS_DORADA }]);
    const con = jugar(SEMILLA, TOQUES_DORADA);
    const sin = jugar(SEMILLA, TOQUES_DORADA, { especiales: false });
    expect(con.piezas).toBe(12);
    expect(con.puntos - sin.puntos).toBe(puntosDeColocada("perfecto", 1));
    expect(con.monedas - sin.monedas).toBe(MONEDAS_DORADA);
    expect({ con: con.doradas, sin: sin.doradas }).toEqual({ con: 1, sin: 0 });
    expect(con.formas[11]).toMatchObject({ especial: "dorada" });
    expect(sin.formas.every((f) => f.especial === undefined)).toBe(true);
  });

  it("la pieza que cuelga lleva su especial en el estado antes de soltarla", () => {
    const partida = new Partida(SEMILLA);
    const vistas: Array<string | undefined> = [];
    const toques = new Set(TOQUES_DORADA);
    while (partida.pasos <= TOQUES_DORADA.at(-1)!) {
      if (toques.has(partida.pasos)) {
        vistas.push(partida.estado().colgada?.especial);
        partida.soltar();
      }
      partida.paso();
    }
    expect(vistas.map((e, i) => (e ? `${i}:${e}` : null)).filter(Boolean)).toEqual(["11:dorada"]);
    expect(partida.estado().cuerpos[11]).toMatchObject({ especial: "dorada" });
    expect(partida.estado().cuerpos[10]).not.toHaveProperty("especial");
  });

  it("una especial que cae no tiene efecto, y el episodio cuesta una sola vida", () => {
    // Las 11 primeras sobre el objetivo y la dorada (11) en el extremo.
    const { partida, eventos } = jugarCon((p, n) => (n < 11 ? sobreObjetivo(p) : enElExtremo(p)), 12);
    seguir(partida, 600, eventos);
    expect(eventos.filter((e) => e.tipo === "caida")).toEqual([expect.objectContaining({ vidas: 2 })]);
    expect(eventos.filter((e) => e.tipo === "especial")).toEqual([]);
    expect(partida.resultado()).toMatchObject({ doradas: 0, piezas: 11, vidas: 2 });
  });

  // Día 8 (2026-11-12): dorada en la 11, pegajosa en la 22 y cemento en la 27.
  // Todas sobre el objetivo (perfectos), 29 piezas.
  const SEMILLA_TRES = "2026-11-12";
  const TOQUES_TRES = [
    120, 273, 428, 581, 734, 873, 1015, 1162, 1297, 1437, 1584, 1716, 1854, 1993, 2130, 2265, 2400, 2525, 2648, 2770, 2900, 3036, 3173,
    3298, 3434, 3548, 3682, 3801, 3935,
  ];

  it("cemento: tras el soltar() siguiente a colocarse, todo lo quieto por debajo de su cima está cementado", () => {
    expect(especialDe(SEMILLA_TRES, 27)).toBe("cemento");
    const partida = new Partida(SEMILLA_TRES);
    const toques = new Set(TOQUES_TRES);
    const eventos: Evento[] = [];
    let antesDeSoltar: ReturnType<Partida["estado"]> | null = null;
    while (partida.pasos <= TOQUES_TRES.at(-1)!) {
      if (toques.has(partida.pasos)) {
        if (partida.pasos === TOQUES_TRES.at(-1)) antesDeSoltar = partida.estado();
        partida.soltar();
      }
      partida.paso();
      eventos.push(...partida.tomarEventos());
    }
    // Antes de ese soltar() quedaban 12 piezas dinámicas, la de cemento incluida.
    expect(antesDeSoltar!.cuerpos.filter((c) => !c.cementada)).toHaveLength(12);
    expect(eventos.filter((e) => e.tipo === "especial" && e.especial === "cemento")).toEqual([
      { tipo: "especial", paso: 3935, especial: "cemento", indice: 27, efecto: 12 },
    ]);
    const cuerpos = partida.estado().cuerpos;
    expect(cuerpos[27]).toMatchObject({ especial: "cemento", cementada: true });
    // Solo queda dinámica la pieza recién soltada (la 28), por encima del cemento.
    expect(cuerpos.slice(0, 28).every((c) => c.cementada)).toBe(true);
    expect(cuerpos[28]!.cementada).toBe(false);
  });

  it("pegajosa sobre la torre: se une a la pieza que toca, y a nada más", () => {
    expect(especialDe(SEMILLA_TRES, 22)).toBe("pegajosa");
    const { partida, eventos } = reproducir(SEMILLA_TRES, TOQUES_TRES.slice(0, 23), 200);
    expect(eventos.filter((e) => e.tipo === "especial" && e.especial === "pegajosa")).toEqual([
      { tipo: "especial", paso: 3223, especial: "pegajosa", indice: 22, efecto: 1 },
    ]);
    expect(partida.uniones).toBe(1);
  });

  // Día 12 (2026-11-16): la pieza 16 es pegajosa. Perfectos hasta la 15, la
  // pegajosa a 0,45 m del objetivo y la 17 a 0,2 m más allá (buscados y
  // fijados). Sin la unión, la 17 arrastra a la pegajosa al mar.
  const SEMILLA_PEGAJOSA = "2026-11-16";
  const TOQUES_PEGAJOSA = [120, 273, 426, 579, 732, 880, 1026, 1170, 1318, 1460, 1593, 1741, 1872, 2000, 2128, 2255, 2395, 2571];

  it("pegajosa: donde sin la unión resbala y cae, con ella se queda en su sitio", () => {
    expect(especialDe(SEMILLA_PEGAJOSA, 16)).toBe("pegajosa");
    const sin = reproducir(SEMILLA_PEGAJOSA, TOQUES_PEGAJOSA, 300, { especiales: false });
    expect(sin.eventos.filter((e) => e.tipo === "colocada").map((e) => e.indice)).toContain(16);
    expect(sin.eventos.filter((e) => e.tipo === "caida")).toEqual([expect.objectContaining({ vidas: 2, perdidas: 2 })]);
    expect(sin.partida.estado().cuerpos).toHaveLength(16);

    // Con la unión, solo cae la 17; la distancia entre la pegajosa y su apoyo (la 15) apenas cambia.
    const partida = new Partida(SEMILLA_PEGAJOSA);
    const toques = new Set(TOQUES_PEGAJOSA);
    const eventos: Evento[] = [];
    const distancias: number[] = [];
    while (partida.pasos <= TOQUES_PEGAJOSA.at(-1)! + 300) {
      if (toques.has(partida.pasos)) partida.soltar();
      partida.paso();
      eventos.push(...partida.tomarEventos());
      const pegada = eventos.find((e) => e.tipo === "especial" && e.especial === "pegajosa");
      if (pegada && partida.pasos - pegada.paso <= 120) {
        const [apoyo, pegajosa] = partida.estado().cuerpos.slice(15, 17);
        distancias.push(Math.hypot(pegajosa!.x - apoyo!.x, pegajosa!.y - apoyo!.y));
      }
    }
    expect(eventos.filter((e) => e.tipo === "especial" && e.especial === "pegajosa")).toEqual([expect.objectContaining({ indice: 16, efecto: 1 })]);
    expect(eventos.filter((e) => e.tipo === "caida")).toEqual([expect.objectContaining({ vidas: 2, perdidas: 1 })]);
    expect(partida.estado().cuerpos[16]).toMatchObject({ especial: "pegajosa" });
    expect(distancias).toHaveLength(121);
    expect(Math.max(...distancias) - Math.min(...distancias)).toBeLessThan(0.01);
  });

  it("retirar en un episodio una pieza unida no lanza excepciones y retira también la unión", () => {
    // El mismo día con la pegajosa a −0,45 m y la 17 a −0,2 m más allá (buscados y
    // fijados): la 17 tira la pegajosa, su apoyo y otras dos en el mismo episodio.
    const toques = [120, 273, 426, 579, 732, 880, 1026, 1170, 1318, 1460, 1593, 1741, 1872, 2000, 2128, 2255, 2366, 2532];
    const antes = reproducir(SEMILLA_PEGAJOSA, toques.slice(0, 17), 120);
    expect(antes.eventos.filter((e) => e.tipo === "especial" && e.especial === "pegajosa")).toEqual([expect.objectContaining({ indice: 16, efecto: 1 })]);
    expect(antes.partida.uniones).toBe(1);
    let despues: ReturnType<typeof reproducir> | null = null;
    expect(() => (despues = reproducir(SEMILLA_PEGAJOSA, toques, 400))).not.toThrow();
    const { partida, eventos } = despues!;
    expect(eventos.filter((e) => e.tipo === "caida")).toEqual([expect.objectContaining({ vidas: 2, perdidas: 5 })]);
    expect(partida.estado().cuerpos.some((c) => c.especial === "pegajosa")).toBe(false);
    expect(partida.uniones).toBe(0);
    expect(partida.fase).toBe("apuntando");
  });

  it("prueba dorada de una partida con las tres especiales", () => {
    // Nueva en H2 (tercera-version): día 8 con dorada, pegajosa y cemento colocadas.
    const resultado = jugar(SEMILLA_TRES, TOQUES_TRES);
    const r6 = (valor: number) => Math.round(valor * 1e6) / 1e6;
    expect({
      puntos: resultado.puntos,
      piezas: resultado.piezas,
      perfectos: resultado.perfectos,
      vidas: resultado.vidas,
      monedas: resultado.monedas,
      doradas: resultado.doradas,
      pasos: resultado.pasos,
      terminada: resultado.terminada,
      altura: r6(resultado.altura),
      especiales: resultado.formas.map((f, i) => (f.especial ? `${i}:${f.especial}` : null)).filter(Boolean),
      ultimas: resultado.posiciones.slice(-4).map((p) => ({ x: r6(p.x), y: r6(p.y), angulo: r6(p.angulo) })),
    }).toEqual({
      puntos: 1900,
      piezas: 29,
      perfectos: 29,
      vidas: 3,
      monedas: 88,
      doradas: 1,
      pasos: 4536,
      terminada: false,
      altura: 22.492809,
      especiales: ["11:dorada", "22:pegajosa", "27:cemento"],
      ultimas: [
        { x: 0.145859, y: 20.010278, angulo: -0.012488 },
        { x: 0.15776, y: 20.687857, angulo: -0.012331 },
        { x: 0.151884, y: 21.407129, angulo: -0.012289 },
        { x: 0.151908, y: 22.132183, angulo: -0.012289 },
      ],
    });
  }, 20_000);
});

/** Pierde las 3 vidas soltando cada pieza en el extremo y devuelve la partida ya acabada. */
function perderTodo(opciones: OpcionesPartida = {}): Partida {
  const { partida } = jugarCon(enElExtremo, 3, opciones);
  while (!partida.terminada) seguir(partida, 1);
  return partida;
}

describe("objetos de ayuda en la simulación (I1)", () => {
  it("con el reloj, la pieza que cuelga y las 4 siguientes van a la velocidad × RELOJ_MULT; la sexta, a la normal", () => {
    const velocidades = (conReloj: boolean): number[] => {
      const partida = new Partida(SEMILLA);
      if (conReloj) expect(partida.usar("reloj")).toBe(true);
      const lista: number[] = [];
      jugarConPartida(partida, (p) => {
        if (sobreObjetivo(p)) {
          lista.push(p.estado().colgada!.velocidad);
          return true;
        }
        return false;
      }, 7);
      return lista;
    };
    const sin = velocidades(false);
    const con = velocidades(true);
    expect(RELOJ_PIEZAS).toBe(5);
    expect(con).toHaveLength(7);
    for (let i = 0; i < RELOJ_PIEZAS; i++) expect(Math.abs(con[i]! - sin[i]! * RELOJ_MULT)).toBeLessThan(0.001);
    expect(con.slice(RELOJ_PIEZAS)).toEqual(sin.slice(RELOJ_PIEZAS));
  });

  it("el reloj no se acumula: usarlo con uno activo no hace nada", () => {
    const partida = new Partida(SEMILLA);
    expect(partida.usar("reloj")).toBe(true);
    const velocidad = partida.estado().colgada!.velocidad;
    expect(partida.usar("reloj")).toBe(false);
    expect(partida.estado().colgada!.velocidad).toBe(velocidad);
  });

  it("usar el reloj a mitad del vaivén no hace saltar la pieza: |x(n+1) − x(n)| ≤ v · PASO", () => {
    for (const pasoReloj of [37, 90, 141]) {
      const partida = new Partida(SEMILLA);
      let anterior = partida.estado().colgada!;
      let saltoMax = 0;
      for (let n = 0; n < 400; n++) {
        if (n === pasoReloj) expect(partida.usar("reloj")).toBe(true);
        partida.paso();
        const ahora = partida.estado().colgada!;
        saltoMax = Math.max(saltoMax, Math.abs(ahora.x - anterior.x) - ahora.velocidad * PASO);
        anterior = ahora;
      }
      expect(saltoMax).toBeLessThanOrEqual(1e-9);
    }
  });

  it("el cemento convierte la pieza que cuelga y luego actúa como en H2; sobre una especial no hace nada", () => {
    const partida = new Partida(SEMILLA);
    expect(partida.usar("cemento")).toBe(true);
    expect(partida.estado().colgada).toMatchObject({ especial: "cemento" });
    // Sobre una pieza que ya es especial (de cemento o, más abajo, la dorada 11), devuelve false.
    expect(partida.usar("cemento")).toBe(false);
    const eventos: Evento[] = [];
    jugarConPartida(partida, sobreObjetivo, 2, eventos);
    expect(eventos.filter((e) => e.tipo === "especial")).toEqual([expect.objectContaining({ especial: "cemento", indice: 0, efecto: 1 })]);
    expect(partida.estado().cuerpos[0]).toMatchObject({ especial: "cemento", cementada: true });

    const conDorada = new Partida(SEMILLA);
    jugarConPartida(conDorada, sobreObjetivo, 11);
    while (conDorada.fase !== "apuntando") seguir(conDorada, 1);
    expect(conDorada.estado().colgada).toMatchObject({ especial: "dorada" });
    const antes = conDorada.estado();
    expect(conDorada.usar("cemento")).toBe(false);
    expect(conDorada.estado()).toEqual(antes);
  });

  it("sin pieza colgando no se puede usar ningún objeto", () => {
    const partida = new Partida(SEMILLA);
    partida.soltar();
    expect(partida.fase).toBe("esperando");
    expect(partida.usar("reloj")).toBe(false);
    expect(partida.usar("cemento")).toBe(false);
  });

  it("seguir() tras perder las vidas: 1 vida, apuntando y los mismos puntos; una sola vez por partida", () => {
    const partida = new Partida(SEMILLA);
    expect(partida.seguir()).toBe(false);
    jugarConPartida(partida, sobreObjetivo, 2);
    jugarConPartida(partida, enElExtremo, 3);
    while (!partida.terminada) seguir(partida, 1);
    const { puntos } = partida.resultado();
    expect(puntos).toBe(20 + 30);
    expect(partida.seguir()).toBe(true);
    expect(partida.estado()).toMatchObject({ vidas: 1, fase: "apuntando", puntos, combo: 0 });
    // Con el respiro el ritmo vuelve a 0 (las caídas ya lo habían bajado): la velocidad inicial.
    expect(partida.estado().colgada!.velocidad).toBe(1.3);
    jugarConPartida(partida, enElExtremo, 1);
    while (!partida.terminada) seguir(partida, 1);
    expect(partida.seguir()).toBe(false);
    expect(partida.terminada).toBe(true);
  });

  it("en el reto, usar y seguir devuelven false, y jugar con ayudas da lo mismo que sin ellas (R13)", () => {
    const reto: OpcionesPartida = { modo: "reto" };
    const partida = new Partida(SEMILLA, reto);
    expect(partida.usar("reloj")).toBe(false);
    expect(partida.usar("cemento")).toBe(false);
    expect(perderTodo(reto).seguir()).toBe(false);
    const { toques } = jugarCon((p, n) => (n < 3 ? sobreObjetivo(p) : enElExtremo(p)), 6, reto);
    const ayudas: Ayuda[] = [{ paso: 0, tipo: "reloj" }, { paso: 0, tipo: "cemento" }, { paso: jugar(SEMILLA, toques, reto).pasos, tipo: "seguir" }];
    expect(jugar(SEMILLA, toques, { ...reto, ayudas })).toEqual(jugar(SEMILLA, toques, reto));
  });

  it("en un nivel se usan objetos pero no se sigue", () => {
    const nivel: OpcionesPartida = { modo: "nivel" };
    expect(new Partida(SEMILLA, nivel).usar("reloj")).toBe(true);
    expect(perderTodo(nivel).seguir()).toBe(false);
    expect(perderTodo({ modo: "libre" }).seguir()).toBe(true);
  });

  it("jugar(semilla, toques, { ayudas }) da lo mismo que una Partida con las mismas ayudas en los mismos pasos", () => {
    // Reloj a mitad del vaivén de la segunda pieza, cemento en la cuarta y,
    // tras perder las vidas, seguir y dos piezas más.
    const partida = new Partida(SEMILLA);
    const toques: number[] = [];
    const ayudas: Ayuda[] = [];
    const usar = (tipo: Ayuda["tipo"]) => {
      const paso = partida.pasos;
      if (tipo === "seguir" ? partida.seguir() : partida.usar(tipo)) ayudas.push({ paso, tipo });
    };
    let soltadas = 0;
    let apuntando = 0;
    while (partida.pasos < 20_000 && soltadas < 9) {
      if (partida.terminada) {
        usar("seguir");
        if (partida.terminada) break;
      }
      apuntando = partida.fase === "apuntando" ? apuntando + 1 : 0;
      if (soltadas === 1 && apuntando === 50) usar("reloj");
      if (soltadas === 3 && apuntando === 1) usar("cemento");
      const tocar = soltadas < 4 || soltadas >= 7 ? sobreObjetivo(partida) : enElExtremo(partida);
      if (tocar && partida.soltar()) {
        toques.push(partida.pasos);
        soltadas++;
      }
      partida.paso();
      partida.tomarEventos();
    }
    seguir(partida, 300);
    expect(ayudas.map((a) => a.tipo)).toEqual(["reloj", "cemento", "seguir"]);
    const enPartida = partida.resultado();
    expect(enPartida.piezas).toBeGreaterThanOrEqual(5);
    const repetida = jugar(SEMILLA, toques, { ayudas, maxPasos: enPartida.pasos });
    expect(repetida).toEqual(enPartida);
    expect(jugar(SEMILLA, toques, { maxPasos: enPartida.pasos })).not.toEqual(enPartida);
  });
});

/** Como `jugarCon`, pero sobre una partida ya creada: suelta cuando `tocar` lo dice, `piezas` veces. */
function jugarConPartida(partida: Partida, tocar: (partida: Partida) => boolean, piezas: number, eventos: Evento[] = []): Evento[] {
  let soltadas = 0;
  while (!partida.terminada && soltadas < piezas && partida.pasos < 200_000) {
    if (partida.fase === "apuntando" && tocar(partida)) {
      partida.soltar();
      soltadas++;
    }
    partida.paso();
    eventos.push(...partida.tomarEventos());
  }
  return eventos;
}

describe("cementado de la base (B3)", () => {
  // Jugador que suelta siempre sobre el objetivo: con esta semilla llega a 150
  // piezas (el experto simulado no pasa de 134 en los días 1 a 30).
  const SEMILLA_LARGA = "2026-11-09";
  const larga = jugarCon(sobreObjetivo, 150, {}, SEMILLA_LARGA);

  it("nunca hay más de MAX_DINAMICAS piezas dinámicas al aparecer una pieza nueva en 150 piezas", () => {
    const partida = new Partida(SEMILLA_LARGA);
    const toques = new Set(larga.toques);
    let maximo = 0;
    let apariciones = 0;
    let anterior = partida.fase;
    while (partida.pasos <= larga.toques.at(-1)!) {
      if (partida.fase === "apuntando" && anterior !== "apuntando") {
        apariciones++;
        maximo = Math.max(maximo, partida.estado().cuerpos.filter((c) => !c.cementada).length);
      }
      anterior = partida.fase;
      if (toques.has(partida.pasos)) partida.soltar();
      partida.paso();
      partida.tomarEventos();
    }
    expect(larga.toques).toHaveLength(150);
    expect(apariciones).toBeGreaterThanOrEqual(150);
    expect(maximo).toBe(MAX_DINAMICAS);
    const cementadas = larga.eventos.reduce((total, e) => total + (e.tipo === "cementada" ? e.piezas : 0), 0);
    expect(cementadas).toBeGreaterThan(20);
  }, 60_000);

  it("una pieza cementada no cambia de posición en los 600 pasos siguientes", () => {
    const { partida, eventos } = jugarCon(sobreObjetivo, MAX_DINAMICAS + 2);
    expect(eventos.some((e) => e.tipo === "cementada")).toBe(true);
    const cementadas = () => partida.estado().cuerpos.filter((c) => c.cementada);
    const antes = cementadas();
    expect(antes.length).toBeGreaterThan(0);
    for (let i = 0; i < 600; i++) {
      if (sobreObjetivo(partida)) partida.soltar();
      partida.paso();
    }
    expect(cementadas().slice(0, antes.length).map(({ x, y, angulo }) => ({ x, y, angulo }))).toEqual(
      antes.map(({ x, y, angulo }) => ({ x, y, angulo })),
    );
  });

  it("cementar una torre dormida apenas mueve las piezas de encima: menos de 1 cm en 30 pasos", () => {
    // Se espera a que la torre se duerma antes de cada suelta y se mide hasta que
    // aterriza la pieza nueva (unos 40 pasos). El requisito de impacto pedía
    // 1 mm en 60 pasos: no se cumple, porque `setType` borra los contactos y las
    // piezas de encima se hunden de 1 a 6 mm al perder el arranque en caliente
    // (medido; unas décimas de píxel en pantalla). Sin cementar, una torre
    // despierta se desplaza varios centímetros en ese tiempo. Con las reglas 3
    // (tercera-version, B1) usa el día 1: en SEMILLA_LARGA la suelta 29 mueve
    // 1,4 cm la pieza de arriba (una columna); en otras 13 semillas medidas el
    // máximo es de 0,63 cm. La pieza nueva, a 1,8 m, aterriza en unos 36 pasos.
    const partida = new Partida(SEMILLA);
    const desplazamientos: number[] = [];
    for (let n = 0; n < 30 && !partida.terminada; ) {
      if (!sobreObjetivo(partida)) {
        partida.paso();
        partida.tomarEventos();
        continue;
      }
      if (n >= MAX_DINAMICAS) {
        seguir(partida, 240);
        while (!sobreObjetivo(partida) && !partida.terminada) seguir(partida, 1);
      }
      const antes = partida.estado().cuerpos;
      partida.soltar();
      n++;
      if (!partida.tomarEventos().some((e) => e.tipo === "cementada")) continue;
      seguir(partida, 30);
      const despues = partida.estado().cuerpos;
      const dinamicas = antes.filter((_, i) => !despues[i]!.cementada);
      const movida = Math.max(...dinamicas.map((c) => Math.hypot(despues[antes.indexOf(c)]!.x - c.x, despues[antes.indexOf(c)]!.y - c.y)));
      desplazamientos.push(movida);
    }
    expect(desplazamientos.length).toBeGreaterThan(10);
    expect(Math.max(...desplazamientos)).toBeLessThan(0.01);
  }, 60_000);
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

  it("simulacion.ts, puntuacion.ts, ritmo.ts y especiales.ts no usan reloj, azar ni trigonometría propia", () => {
    for (const archivo of ["logica/simulacion.ts", "logica/puntuacion.ts", "logica/ritmo.ts", "logica/especiales.ts"]) {
      const codigo = readFileSync(new URL(archivo, raiz), "utf8");
      for (const prohibido of ["Math.random", "Date.now", "performance.now", "Math.sin", "Math.cos"]) {
        expect(codigo).not.toContain(prohibido);
      }
    }
  });
});
