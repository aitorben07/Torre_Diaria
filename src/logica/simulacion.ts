// Simulación de la partida sin pantalla, con planck (D2). Es el único archivo
// que importa planck. La pantalla (src/juego) usa la misma API de pasos
// (`paso()` y `soltar()`), así que una partida en pantalla equivale a
// `jugar(semilla, toques, opciones)`. Los puntos, el combo y las vidas los
// lleva el `Marcador` de `puntuacion.ts` (B2).
//
// Reglas de determinismo (T4): todo se cuenta en pasos de 1/60 s; el vaivén es
// una onda triangular sin trigonometría; las piezas nacen con ángulo 0; las
// opciones del mundo son constantes; los cuerpos se crean siempre en el mismo
// orden; y aquí no se lee el reloj ni se usa azar. planck sí usa seno y coseno
// por dentro, así que el resultado solo se garantiza igual en el mismo motor.
import { Box, Polygon, Vec2, World, type Body, type Fixture } from "planck";
import { Secuencia, verticesPieza, type Forma, type Pieza } from "./piezas.ts";
import { calidadDeSuelta, Marcador, VIDAS_INICIALES, type Calidad } from "./puntuacion.ts";

/** Versión de las reglas: se guarda con cada resultado para distinguir las partidas de la v1 (B1). */
export const REGLAS = 2;

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

/**
 * Al caer una pieza, la partida sigue simulando hasta que todas las piezas que
 * siguen en el mundo están quietas, o como mucho estos pasos, y entonces cierra
 * el episodio: retira lo caído y resta una vida (B1).
 */
export const MAX_PASOS_ASENTAR = 180;
/** Al cerrar un episodio también se retiran las piezas que bajan más rápido que esto (m/s). */
export const BAJADA_RETIRAR = 0.5;

/**
 * Como mucho estas piezas dinámicas: al soltar una pieza nueva, las más
 * antiguas que estén dormidas o quietas pasan a estáticas («cementadas», B3).
 */
export const MAX_DINAMICAS = 12;

/** Pasos que `jugar` sigue simulando tras el último toque si nadie pone límite. */
export const MARGEN_PASOS = 600;

export const DENSIDAD = 1;
export const FRICCION = 0.8;

export type Fase = "apuntando" | "esperando" | "asentando" | "fin";

export type CuerpoVisible = { pieza: Pieza; x: number; y: number; angulo: number; cementada?: boolean };

export type EstadoPartida = {
  fase: Fase;
  pasos: number;
  puntos: number;
  /** Altura actual de la torre (piezas sobre la plataforma). */
  altura: number;
  vidas: number;
  combo: number;
  /** x del objetivo: centro de la pieza en pie más alta, o 0 si no hay ninguna. */
  objetivo: number;
  /** Pieza que cuelga, o `null` mientras se espera o al acabar. */
  colgada: CuerpoVisible | null;
  /** Piezas que siguen en el mundo; las caídas se retiran al cerrar cada episodio. */
  cuerpos: CuerpoVisible[];
};

export type FormaColocada = { forma: Forma; color: number; ancho: number; alto: number };

/** Eventos de la partida, en orden, para la pantalla (B1). Solo informan: no cambian la física. */
export type Evento =
  | { tipo: "soltada"; paso: number; indice: number; calidad: Calidad; x: number }
  | { tipo: "colocada"; paso: number; indice: number; calidad: Calidad; combo: number; puntos: number }
  | { tipo: "caida"; paso: number; vidas: number; perdidas: number }
  | { tipo: "vidaExtra"; paso: number; vidas: number }
  | { tipo: "hito"; paso: number; metros: number }
  | { tipo: "cementada"; paso: number; piezas: number }
  | { tipo: "fin"; paso: number; puntos: number };

export type OpcionesPartida = {
  /** Vidas al empezar (por defecto `VIDAS_INICIALES`). */
  vidas?: number;
};

export type OpcionesJugar = OpcionesPartida & {
  /** Pasos como mucho (por defecto, el último toque más `MARGEN_PASOS`). */
  maxPasos?: number;
};

export type Resultado = {
  puntos: number;
  /** Altura de la torre al acabar. */
  altura: number;
  /** Altura máxima que llegó a tener la torre. */
  alturaMax: number;
  /** Piezas colocadas (las que puntuaron), en orden. */
  formas: FormaColocada[];
  piezas: number;
  perfectos: number;
  comboMax: number;
  vidas: number;
  monedas: number;
  terminada: boolean;
  pasos: number;
  /** Posición final de cada pieza que sigue en el mundo, en el orden en que se soltó. */
  posiciones: Array<{ x: number; y: number; angulo: number }>;
};

/** Posición horizontal de la pieza que cuelga, `pasoLocal` pasos después de aparecer. */
export function posicionVaiven(pasoLocal: number, velocidad: number, desdeDerecha: boolean): number {
  const recorrido = 4 * AMPLITUD;
  const distancia = (pasoLocal * velocidad * PASO) % recorrido;
  const x = distancia < 2 * AMPLITUD ? -AMPLITUD + distancia : 3 * AMPLITUD - distancia;
  return desdeDerecha ? -x : x;
}

/**
 * Objetivo de la suelta (B2, corrección de impacto): x del centro de la pieza
 * con la cara de arriba (`cima`, el `upperBound.y` de su caja) más alta; en
 * empate, la última de la lista (la última soltada). 0 si no hay ninguna.
 */
export function objetivoDe(piezas: Array<{ x: number; cima: number }>): number {
  let objetivo = 0;
  let cima = -Infinity;
  for (const pieza of piezas) {
    if (pieza.cima >= cima) {
      cima = pieza.cima;
      objetivo = pieza.x;
    }
  }
  return objetivo;
}

type Soltada = { pieza: Pieza; cuerpo: Body; fixture: Fixture; cementada: boolean };

/** Pieza soltada que aún no cuenta como colocada. */
type EnEspera = { indice: number; calidad: Calidad };

export class Partida {
  private readonly mundo = new World(OPCIONES_MUNDO);
  private readonly secuencia: Secuencia;
  private readonly marcador: Marcador;
  /** Piezas soltadas que siguen en el mundo, en orden de soltado. */
  private soltadas: Soltada[] = [];
  private readonly colocadas: FormaColocada[] = [];
  private eventos: Evento[] = [];
  private faseActual: Fase = "apuntando";
  private pasosHechos = 0;
  private indice = 0;
  private pasoAparicion = 0;
  private pasoSoltada = 0;
  private pasoCaida = 0;
  private enEspera: EnEspera | null = null;
  private colgadaY = 0;

  constructor(semilla: string, opciones: OpcionesPartida = {}) {
    this.secuencia = new Secuencia(semilla);
    this.marcador = new Marcador(opciones.vidas ?? VIDAS_INICIALES);
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

  /**
   * Suelta la pieza que cuelga. Devuelve `false` (y no hace nada) si no hay
   * ninguna. En un perfecto, la pieza se crea justo en la x del objetivo (imán, B2).
   */
  soltar(): boolean {
    if (this.faseActual !== "apuntando") return false;
    this.cementar(MAX_DINAMICAS - 1);
    const pieza = this.piezaActual();
    const objetivo = this.objetivo();
    const xColgada = this.xColgada();
    const calidad = calidadDeSuelta(Math.abs(xColgada - objetivo), this.indice);
    const x = calidad === "perfecto" ? objetivo : xColgada;
    const cuerpo = this.mundo.createBody({ type: "dynamic", position: new Vec2(x, this.colgadaY), angle: 0 });
    const fixture = cuerpo.createFixture({
      shape: new Polygon(verticesPieza(pieza).map((v) => new Vec2(v.x, v.y))),
      density: DENSIDAD,
      friction: FRICCION,
      restitution: 0,
    });
    this.soltadas.push({ pieza, cuerpo, fixture, cementada: false });
    this.enEspera = { indice: this.indice, calidad };
    this.eventos.push({ tipo: "soltada", paso: this.pasosHechos, indice: this.indice, calidad, x });
    this.faseActual = "esperando";
    this.pasoSoltada = this.pasosHechos;
    return true;
  }

  /**
   * Avanza un paso fijo de la simulación. Cuando cae una pieza pasa a
   * «asentando»: sigue simulando sin piezas nuevas hasta que todo está quieto o
   * pasan `MAX_PASOS_ASENTAR` pasos, y entonces cierra el episodio (ver
   * `cerrarEpisodio`). Al acabar ya no hace nada.
   */
  paso(): void {
    if (this.faseActual === "fin") return;
    this.mundo.step(PASO, ITERACIONES_VELOCIDAD, ITERACIONES_POSICION);
    this.pasosHechos++;
    if (this.faseActual === "asentando") {
      const todasQuietas = this.soltadas.filter((s) => this.sigueEnPie(s)).every((s) => this.quieta(s));
      if (todasQuietas || this.pasosHechos - this.pasoCaida >= MAX_PASOS_ASENTAR) this.cerrarEpisodio();
      return;
    }
    if (this.soltadas.some((s) => !this.sigueEnPie(s))) {
      this.faseActual = "asentando";
      this.pasoCaida = this.pasosHechos;
      return;
    }
    if (this.faseActual === "esperando") {
      const espera = this.pasosHechos - this.pasoSoltada;
      if ((espera >= ESPERA_MIN && this.quieta(this.soltadas.at(-1)!)) || espera >= ESPERA_MAX) {
        this.colocarEnEspera();
        this.indice++;
        this.colgarPieza();
      }
    }
  }

  /** Devuelve los eventos ocurridos desde la última llamada y vacía la cola. */
  tomarEventos(): Evento[] {
    const eventos = this.eventos;
    this.eventos = [];
    return eventos;
  }

  estado(): EstadoPartida {
    const pieza = this.piezaActual();
    return {
      fase: this.faseActual,
      pasos: this.pasosHechos,
      puntos: this.marcador.puntos,
      altura: this.alturaTorre(this.sobrePlataforma()),
      vidas: this.marcador.vidas,
      combo: this.marcador.combo,
      objetivo: this.objetivo(),
      colgada: this.faseActual === "apuntando" ? { pieza, x: this.xColgada(), y: this.colgadaY, angulo: 0 } : null,
      cuerpos: this.soltadas.map(({ pieza, cuerpo, cementada }) => {
        const p = cuerpo.getPosition();
        return { pieza, x: p.x, y: p.y, angulo: cuerpo.getAngle(), cementada };
      }),
    };
  }

  resultado(): Resultado {
    const m = this.marcador;
    return {
      puntos: m.puntos,
      altura: this.alturaTorre(this.sobrePlataforma()),
      alturaMax: m.alturaMax,
      formas: this.colocadas.map((f) => ({ ...f })),
      piezas: m.piezas,
      perfectos: m.perfectos,
      comboMax: m.comboMax,
      vidas: m.vidas,
      monedas: m.monedas,
      terminada: this.terminada,
      pasos: this.pasosHechos,
      posiciones: this.soltadas.map(({ cuerpo }) => {
        const p = cuerpo.getPosition();
        return { x: p.x, y: p.y, angulo: cuerpo.getAngle() };
      }),
    };
  }

  private piezaActual(): Pieza {
    return this.secuencia.pieza(this.indice);
  }

  private xColgada(): number {
    return posicionVaiven(this.pasosHechos - this.pasoAparicion, this.piezaActual().velocidad, this.indice % 2 === 1);
  }

  private objetivo(): number {
    return objetivoDe(
      this.sobrePlataforma().map((s) => ({ x: s.cuerpo.getPosition().x, cima: s.fixture.getAABB(0).upperBound.y })),
    );
  }

  /** La pieza en espera cuenta como colocada: puntos, combo, vida extra e hitos. */
  private colocarEnEspera(): void {
    const enEspera = this.enEspera;
    if (!enEspera) return;
    this.enEspera = null;
    const pieza = this.secuencia.pieza(enEspera.indice);
    const { puntos, combo, vidaExtra } = this.marcador.colocar(enEspera.calidad);
    this.colocadas.push({ forma: pieza.forma, color: pieza.color, ancho: pieza.ancho, alto: pieza.alto });
    const paso = this.pasosHechos;
    this.eventos.push({ tipo: "colocada", paso, indice: enEspera.indice, calidad: enEspera.calidad, combo, puntos });
    if (vidaExtra) this.eventos.push({ tipo: "vidaExtra", paso, vidas: this.marcador.vidas });
    for (const metros of this.marcador.medirAltura(this.alturaTorre(this.sobrePlataforma()))) {
      this.eventos.push({ tipo: "hito", paso, metros });
    }
  }

  /**
   * Fin de un episodio de caída (B1): retira, en el orden en que se soltaron, las
   * piezas caídas, las que quedan fuera de la plataforma y las que siguen
   * bajando deprisa, para que un derrumbe que aún resbala no cueste otra vida.
   * Resta una vida; si quedan, cuelga la siguiente pieza sobre lo que sigue en
   * pie. La pieza que estaba en espera no puntúa.
   */
  private cerrarEpisodio(): void {
    const retirar = this.soltadas.filter((s) => !s.cementada && this.debeRetirarse(s));
    for (const s of retirar) this.mundo.destroyBody(s.cuerpo);
    this.soltadas = this.soltadas.filter((s) => !retirar.includes(s));
    const vidas = this.marcador.caer();
    this.eventos.push({ tipo: "caida", paso: this.pasosHechos, vidas, perdidas: retirar.length });
    if (this.enEspera) {
      this.enEspera = null;
      this.indice++;
    }
    if (vidas <= 0) {
      this.faseActual = "fin";
      this.eventos.push({ tipo: "fin", paso: this.pasosHechos, puntos: this.marcador.puntos });
      return;
    }
    this.colgarPieza();
  }

  private debeRetirarse(s: Soltada): boolean {
    const p = s.cuerpo.getPosition();
    return (
      !this.sigueEnPie(s) || Math.abs(p.x) > PLATAFORMA_MEDIO_ANCHO || s.cuerpo.getLinearVelocity().y < -BAJADA_RETIRAR
    );
  }

  private colgarPieza(): void {
    this.colgadaY = this.alturaTorre(this.enPie()) + HUECO_COLGADA + this.piezaActual().alto / 2;
    this.pasoAparicion = this.pasosHechos;
    this.faseActual = "apuntando";
  }

  /**
   * Si hay más de `maximo` piezas dinámicas, pasan a estáticas las más antiguas
   * que estén dormidas o quietas (B3). Se hace al soltar, justo antes de crear
   * la pieza nueva (fuera de `mundo.step` y nunca durante «asentando»):
   * `setType` borra los contactos del cuerpo y planck solo los vuelve a buscar
   * al empezar el paso si se acaba de crear un fixture, como la pieza nueva. Al
   * colgar la pieza, en cambio, las de encima caerían un paso sin apoyo (un
   * salto de 1 cm medido). Basta con «quieta» porque la torre no siempre llega
   * a dormirse antes del toque siguiente.
   */
  private cementar(maximo: number): void {
    let dinamicas = this.soltadas.filter((s) => !s.cementada).length;
    let cementadas = 0;
    for (const s of this.soltadas) {
      if (dinamicas <= maximo) break;
      if (s.cementada || (s.cuerpo.isAwake() && !this.quieta(s))) continue;
      s.cuerpo.setType("static");
      s.cementada = true;
      dinamicas--;
      cementadas++;
    }
    if (cementadas > 0) this.eventos.push({ tipo: "cementada", paso: this.pasosHechos, piezas: cementadas });
  }

  private sigueEnPie({ cuerpo }: Soltada): boolean {
    const p = cuerpo.getPosition();
    return p.y >= 0 && Math.abs(p.x) <= LIMITE_X;
  }

  private quieta({ cuerpo }: Soltada): boolean {
    return (
      Vec2.lengthOf(cuerpo.getLinearVelocity()) < UMBRAL_QUIETA && Math.abs(cuerpo.getAngularVelocity()) < UMBRAL_QUIETA
    );
  }

  private enPie(): Soltada[] {
    return this.soltadas.filter((s) => this.sigueEnPie(s));
  }

  /** Piezas con el centro por encima de la cara superior de la plataforma y dentro de su ancho. */
  private sobrePlataforma(): Soltada[] {
    return this.soltadas.filter(({ cuerpo }) => {
      const p = cuerpo.getPosition();
      return p.y > 0 && Math.abs(p.x) <= PLATAFORMA_MEDIO_ANCHO;
    });
  }

  /**
   * Altura en metros de la parte más alta de las piezas dadas. La pieza nueva
   * cuelga sobre todas las que siguen en pie, para no nacer dentro de ninguna.
   */
  private alturaTorre(piezas: Soltada[]): number {
    let altura = 0;
    for (const s of piezas) altura = Math.max(altura, s.fixture.getAABB(0).upperBound.y);
    return altura;
  }
}

/**
 * Reproduce una partida: en cada paso cuyo número esté en `toques`, suelta la
 * pieza (si cuelga alguna) antes de avanzar. Sigue hasta que la partida acaba o
 * se llega a `opciones.maxPasos` (por defecto, el último toque más
 * `MARGEN_PASOS`). Si una pieza ya ha caído, termina de asentar aunque pase el
 * límite, como la pantalla.
 */
export function jugar(semilla: string, toques: number[], opciones: OpcionesJugar = {}): Resultado {
  const { maxPasos, ...deLaPartida } = opciones;
  const partida = new Partida(semilla, deLaPartida);
  const pendientes = new Set(toques);
  const limite = maxPasos ?? Math.max(-1, ...toques) + 1 + MARGEN_PASOS;
  while (!partida.terminada && (partida.pasos < limite || partida.fase === "asentando")) {
    if (pendientes.has(partida.pasos)) partida.soltar();
    partida.paso();
    partida.tomarEventos();
  }
  return partida.resultado();
}
