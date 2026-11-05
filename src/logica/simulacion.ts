// Simulación de la partida sin pantalla, con planck (D2). Es el único archivo
// que importa planck. La pantalla (src/juego) usa la misma API de pasos
// (`paso()` y `soltar()`), así que una partida en pantalla equivale a
// `jugar(semilla, toques)`.
//
// Reglas de determinismo (T4): todo se cuenta en pasos de 1/60 s; el vaivén es
// una onda triangular sin trigonometría; las piezas nacen con ángulo 0; las
// opciones del mundo son constantes; los cuerpos se crean siempre en el mismo
// orden; y aquí no se lee el reloj ni se usa azar. planck sí usa seno y coseno
// por dentro, así que el resultado solo se garantiza igual en el mismo motor.
import { Box, Polygon, Vec2, World, type Body, type Fixture } from "planck";
import { generarSecuencia, verticesPieza, type Forma, type Pieza } from "./piezas.ts";

/** Paso fijo de la simulación, en segundos. */
export const PASO = 1 / 60;
export const ITERACIONES_VELOCIDAD = 8;
export const ITERACIONES_POSICION = 3;
export const OPCIONES_MUNDO = {
  gravity: { x: 0, y: -10 },
  allowSleep: true,
  warmStarting: true,
  continuousPhysics: true,
  subStepping: false,
  blockSolve: true,
} as const;

/** Plataforma de 4 m de ancho con la cara superior en y = 0. */
export const PLATAFORMA_MEDIO_ANCHO = 2;
export const PLATAFORMA_ALTO = 1;

/** El vaivén va de -AMPLITUD a +AMPLITUD: sobrepasa los bordes de la plataforma. */
export const AMPLITUD = 3.4;
/** Hueco entre la cima de la torre y la base de la pieza que cuelga. */
export const HUECO_COLGADA = 2.5;

/** Espera mínima y máxima, en pasos, antes de que aparezca la siguiente pieza. */
export const ESPERA_MIN = 20;
export const ESPERA_MAX = 120;
export const UMBRAL_QUIETA = 0.05;

/** Fuera de estos límites la pieza se da por caída. */
export const LIMITE_X = 12;

/** Pasos que `jugar` sigue simulando tras el último toque si nadie pone límite. */
export const MARGEN_PASOS = 600;

export const DENSIDAD = 1;
export const FRICCION = 0.8;

export type Fase = "apuntando" | "esperando" | "fin";

export type CuerpoVisible = { pieza: Pieza; x: number; y: number; angulo: number };

export type EstadoPartida = {
  fase: Fase;
  pasos: number;
  puntos: number;
  altura: number;
  /** Pieza que cuelga, o `null` mientras se espera o al acabar. */
  colgada: CuerpoVisible | null;
  cuerpos: CuerpoVisible[];
};

export type FormaColocada = { forma: Forma; color: number };

export type Resultado = {
  puntos: number;
  altura: number;
  formas: FormaColocada[];
  terminada: boolean;
  pasos: number;
  /** Posición final de cada pieza soltada, en el orden en que se soltó. */
  posiciones: Array<{ x: number; y: number; angulo: number }>;
};

/** Posición horizontal de la pieza que cuelga, `pasoLocal` pasos después de aparecer. */
export function posicionVaiven(pasoLocal: number, velocidad: number, desdeDerecha: boolean): number {
  const recorrido = 4 * AMPLITUD;
  const distancia = (pasoLocal * velocidad * PASO) % recorrido;
  const x = distancia < 2 * AMPLITUD ? -AMPLITUD + distancia : 3 * AMPLITUD - distancia;
  return desdeDerecha ? -x : x;
}

type Soltada = { pieza: Pieza; cuerpo: Body; fixture: Fixture };

export class Partida {
  private readonly mundo = new World(OPCIONES_MUNDO);
  private readonly piezas: Pieza[];
  private readonly soltadas: Soltada[] = [];
  private faseActual: Fase = "apuntando";
  private pasosHechos = 0;
  private indice = 0;
  private pasoAparicion = 0;
  private pasoSoltada = 0;
  private colgadaY = 0;

  constructor(semilla: string) {
    this.piezas = generarSecuencia(semilla);
    const plataforma = this.mundo.createBody({ type: "static", position: new Vec2(0, -PLATAFORMA_ALTO / 2) });
    plataforma.createFixture({ shape: new Box(PLATAFORMA_MEDIO_ANCHO, PLATAFORMA_ALTO / 2), friction: FRICCION });
    this.colgarPieza();
  }

  get fase(): Fase {
    return this.faseActual;
  }

  get pasos(): number {
    return this.pasosHechos;
  }

  get terminada(): boolean {
    return this.faseActual === "fin";
  }

  /** Suelta la pieza que cuelga. Devuelve `false` (y no hace nada) si no hay ninguna. */
  soltar(): boolean {
    if (this.faseActual !== "apuntando") return false;
    const pieza = this.piezaActual();
    const cuerpo = this.mundo.createBody({
      type: "dynamic",
      position: new Vec2(this.xColgada(), this.colgadaY),
      angle: 0,
    });
    const fixture = cuerpo.createFixture({
      shape: new Polygon(verticesPieza(pieza).map((v) => new Vec2(v.x, v.y))),
      density: DENSIDAD,
      friction: FRICCION,
      restitution: 0,
    });
    this.soltadas.push({ pieza, cuerpo, fixture });
    this.faseActual = "esperando";
    this.pasoSoltada = this.pasosHechos;
    return true;
  }

  /** Avanza un paso fijo de la simulación. Al acabar la partida ya no hace nada. */
  paso(): void {
    if (this.faseActual === "fin") return;
    this.mundo.step(PASO, ITERACIONES_VELOCIDAD, ITERACIONES_POSICION);
    this.pasosHechos++;
    if (this.soltadas.some((s) => !this.sigueEnPie(s))) {
      this.faseActual = "fin";
      return;
    }
    if (this.faseActual === "esperando") {
      const espera = this.pasosHechos - this.pasoSoltada;
      const ultima = this.soltadas.at(-1)!.cuerpo;
      const quieta =
        Vec2.lengthOf(ultima.getLinearVelocity()) < UMBRAL_QUIETA &&
        Math.abs(ultima.getAngularVelocity()) < UMBRAL_QUIETA;
      if ((espera >= ESPERA_MIN && quieta) || espera >= ESPERA_MAX) {
        this.indice++;
        this.colgarPieza();
      }
    }
  }

  estado(): EstadoPartida {
    const pieza = this.piezaActual();
    return {
      fase: this.faseActual,
      pasos: this.pasosHechos,
      puntos: this.enPie().length,
      altura: this.alturaTorre(),
      colgada: this.faseActual === "apuntando" ? { pieza, x: this.xColgada(), y: this.colgadaY, angulo: 0 } : null,
      cuerpos: this.soltadas.map(({ pieza, cuerpo }) => {
        const p = cuerpo.getPosition();
        return { pieza, x: p.x, y: p.y, angulo: cuerpo.getAngle() };
      }),
    };
  }

  resultado(): Resultado {
    const enPie = this.enPie();
    return {
      puntos: enPie.length,
      altura: this.alturaTorre(),
      formas: enPie.map(({ pieza }) => ({ forma: pieza.forma, color: pieza.color })),
      terminada: this.terminada,
      pasos: this.pasosHechos,
      posiciones: this.soltadas.map(({ cuerpo }) => {
        const p = cuerpo.getPosition();
        return { x: p.x, y: p.y, angulo: cuerpo.getAngle() };
      }),
    };
  }

  private piezaActual(): Pieza {
    return this.piezas[this.indice % this.piezas.length]!;
  }

  private xColgada(): number {
    return posicionVaiven(this.pasosHechos - this.pasoAparicion, this.piezaActual().velocidad, this.indice % 2 === 1);
  }

  private colgarPieza(): void {
    this.colgadaY = this.alturaTorre() + HUECO_COLGADA + this.piezaActual().alto / 2;
    this.pasoAparicion = this.pasosHechos;
    this.faseActual = "apuntando";
  }

  private sigueEnPie({ cuerpo }: Soltada): boolean {
    const p = cuerpo.getPosition();
    return p.y >= 0 && Math.abs(p.x) <= LIMITE_X;
  }

  private enPie(): Soltada[] {
    return this.soltadas.filter((s) => this.sigueEnPie(s));
  }

  /** Altura en metros de la parte más alta de las piezas que siguen en pie. */
  private alturaTorre(): number {
    let altura = 0;
    for (const s of this.enPie()) altura = Math.max(altura, s.fixture.getAABB(0).upperBound.y);
    return altura;
  }
}

/**
 * Reproduce una partida: en cada paso cuyo número esté en `toques`, suelta la
 * pieza (si cuelga alguna) antes de avanzar. Sigue hasta que la partida acaba o
 * se llega a `maxPasos` (por defecto, el último toque más `MARGEN_PASOS`).
 */
export function jugar(semilla: string, toques: number[], maxPasos?: number): Resultado {
  const partida = new Partida(semilla);
  const pendientes = new Set(toques);
  const limite = maxPasos ?? Math.max(-1, ...toques) + 1 + MARGEN_PASOS;
  while (!partida.terminada && partida.pasos < limite) {
    if (pendientes.has(partida.pasos)) partida.soltar();
    partida.paso();
  }
  return partida.resultado();
}
