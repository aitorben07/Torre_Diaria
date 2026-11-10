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
import { Box, Polygon, Vec2, WeldJoint, World, type Body, type Fixture } from "planck";
import { especialDe, MONEDAS_DORADA, type Especial } from "./especiales.ts";
import { Secuencia, verticesPieza, type Forma, type FormasSecuencia, type Pieza } from "./piezas.ts";
import { calidadDeSuelta, Marcador, VIDAS_INICIALES, type Calidad } from "./puntuacion.ts";
import { siguienteRitmo, velocidadDe, VEL_INICIAL } from "./ritmo.ts";

/**
 * Versión de las reglas: se guarda con cada resultado (B1). 1: la v1; 2: la
 * v2 (velocidad fija por pieza); 3: la tercera versión (velocidad por ritmo,
 * recorrido y caída más cortos). Los días guardados con otra versión conservan
 * sus puntos y su medalla (`diarios.ts`, R16).
 */
export const REGLAS = 3;

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

/**
 * El vaivén va de -AMPLITUD a +AMPLITUD: sobrepasa los bordes de la
 * plataforma. En las reglas 3 baja de 3,4 a 2,6 m y el hueco de 2,5 a 1,8 m:
 * con 1,3 m/s la primera pieza llega al centro en 2,0 s (B2, medido en impacto 2.1).
 */
export const AMPLITUD = 2.6;
/** Hueco entre la cima de la torre y la base de la pieza que cuelga. */
export const HUECO_COLGADA = 1.8;

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

/** `especial`: dorada, pegajosa o cemento (H1); sin el campo, una pieza normal. */
export type CuerpoVisible = { pieza: Pieza; x: number; y: number; angulo: number; cementada?: boolean; especial?: Especial };

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
  /** Pieza que cuelga, con su velocidad de vaivén en m/s (B1), o `null` mientras se espera o al acabar. */
  colgada: (CuerpoVisible & { velocidad: number }) | null;
  /** Piezas que siguen en el mundo; las caídas se retiran al cerrar cada episodio. */
  cuerpos: CuerpoVisible[];
};

export type FormaColocada = { forma: Forma; color: number; ancho: number; alto: number; especial?: Especial };

/** Eventos de la partida, en orden, para la pantalla (B1). Solo informan: no cambian la física. */
export type Evento =
  | { tipo: "soltada"; paso: number; indice: number; calidad: Calidad; x: number }
  | { tipo: "colocada"; paso: number; indice: number; calidad: Calidad; combo: number; puntos: number }
  | { tipo: "caida"; paso: number; vidas: number; perdidas: number }
  | { tipo: "vidaExtra"; paso: number; vidas: number }
  | { tipo: "hito"; paso: number; metros: number }
  | { tipo: "cementada"; paso: number; piezas: number }
  /**
   * Una especial actúa (H2). `efecto`: en la dorada, las monedas de más; en la
   * pegajosa, las piezas a las que se une; en la de cemento, las que pasan a
   * piedra en ese `soltar()`.
   */
  | { tipo: "especial"; paso: number; especial: Especial; indice: number; efecto: number }
  | { tipo: "fin"; paso: number; puntos: number; victoria: boolean };

/**
 * Objetivo de un nivel (E1, Anexo 1, 6): coloca N piezas, llega a N m, haz N
 * perfectos, combo de N, consigue N puntos o llega a N m con como mucho M piezas.
 */
export type Objetivo =
  | { tipo: "piezas"; piezas: number }
  | { tipo: "altura"; metros: number }
  | { tipo: "perfectos"; perfectos: number }
  | { tipo: "combo"; combo: number }
  | { tipo: "puntos"; puntos: number }
  | { tipo: "alturaConPiezas"; metros: number; piezas: number };

/** Lo que mira un objetivo justo después de colocar una pieza. */
export type Marca = { piezas: number; altura: number; perfectos: number; combo: number; puntos: number };

/**
 * ¿Se cumple el objetivo con esta marca? `"fallado"` solo en «N m con como
 * mucho M piezas», al colocar la pieza M sin llegar.
 */
export function evaluarObjetivo(objetivo: Objetivo, marca: Marca): "cumplido" | "fallado" | "sigue" {
  switch (objetivo.tipo) {
    case "piezas":
      return marca.piezas >= objetivo.piezas ? "cumplido" : "sigue";
    case "altura":
      return marca.altura >= objetivo.metros ? "cumplido" : "sigue";
    case "perfectos":
      return marca.perfectos >= objetivo.perfectos ? "cumplido" : "sigue";
    case "combo":
      return marca.combo >= objetivo.combo ? "cumplido" : "sigue";
    case "puntos":
      return marca.puntos >= objetivo.puntos ? "cumplido" : "sigue";
    case "alturaConPiezas":
      if (marca.altura >= objetivo.metros) return "cumplido";
      return marca.piezas >= objetivo.piezas ? "fallado" : "sigue";
  }
}

/** Opciones de una partida. Todas son datos (van en `data-opciones` para repetirla con `jugar`, G3). */
export type OpcionesPartida = {
  /** Vidas al empezar (por defecto `VIDAS_INICIALES`). */
  vidas?: number;
  /** Velocidad de la primera pieza; luego la mueve el ritmo (niveles, E1; por defecto `VEL_INICIAL`). */
  velocidad?: number;
  /** Formas de la secuencia (niveles, E1; por defecto todas). */
  formas?: FormasSecuencia;
  /** Objetivo del nivel: al cumplirse, la partida acaba con `victoria` (E1). */
  objetivo?: Objetivo;
  /** Piezas especiales de la semilla (H1; por defecto `true`; los niveles 1 a 3, `false`). */
  especiales?: boolean;
  /**
   * Modo de la partida (I1; por defecto `"libre"`). En `"reto"` no se usan
   * objetos ni se sigue (R13); en `"nivel"` se usan objetos pero no se sigue.
   */
  modo?: ModoPartida;
};

export type ModoPartida = "libre" | "reto" | "nivel";

/** Objetos de ayuda que se usan con una pieza colgando (I1, Anexo H). */
export type Objeto = "reloj" | "cemento";

/** Una ayuda usada en el paso `paso`: un objeto, o seguir tras perder la última vida (I1). */
export type Ayuda = { paso: number; tipo: Objeto | "seguir" };

/** Piezas que frena el reloj de arena, contando la que cuelga (I1). */
export const RELOJ_PIEZAS = 5;

export type OpcionesJugar = OpcionesPartida & {
  /** Pasos como mucho (por defecto, el último toque o ayuda más `MARGEN_PASOS`). */
  maxPasos?: number;
  /** Ayudas usadas, cada una en su paso (`data-ayudas` en pantalla, R3). */
  ayudas?: readonly Ayuda[];
};

export type Resultado = {
  puntos: number;
  /** Altura de la torre al acabar. */
  altura: number;
  /** Altura máxima que llegó a tener la torre. */
  alturaMax: number;
  /** Piezas colocadas (las que puntuaron), en orden. */
  formas: FormaColocada[];
  /** Índice en la secuencia de cada pieza de `formas`: con la semilla basta para rehacerlas (C1). */
  indices: number[];
  piezas: number;
  perfectos: number;
  comboMax: number;
  vidas: number;
  /** Monedas de la partida, con las de las doradas colocadas (H2). */
  monedas: number;
  /** Doradas colocadas: cada una da `MONEDAS_DORADA` monedas (H2). */
  doradas: number;
  terminada: boolean;
  /** Objetivo de nivel cumplido; sin objetivo, siempre `false`. */
  victoria: boolean;
  pasos: number;
  /** Posición final de cada pieza que sigue en el mundo, en el orden en que se soltó. */
  posiciones: Array<{ x: number; y: number; angulo: number }>;
};

/**
 * Posición horizontal de la pieza que cuelga tras recorrer `recorrida` metros
 * desde que aparece. La partida acumula la distancia (I1, impacto 2.3): si la
 * velocidad cambia a mitad del vaivén (el reloj de arena), la pieza sigue desde
 * donde estaba en lugar de saltar.
 */
export function posicionVaiven(recorrida: number, desdeDerecha: boolean): number {
  const recorrido = 4 * AMPLITUD;
  const distancia = recorrida % recorrido;
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

/** Con el campo `especial` solo si lo es: las piezas normales quedan igual que antes de H1. */
function conEspecial<T extends object>(valor: T, especial: Especial | null): T & { especial?: Especial } {
  return especial ? { ...valor, especial } : valor;
}

type Soltada = { pieza: Pieza; cuerpo: Body; fixture: Fixture; cementada: boolean; especial: Especial | null; indice: number };

/** Pieza soltada que aún no cuenta como colocada. */
type EnEspera = { indice: number; calidad: Calidad; soltada: Soltada };

/** Cemento colocado (H2) con piezas por pasar a piedra en los `soltar()` siguientes. */
type CementoPendiente = { indice: number; piezas: Soltada[]; aplicado: boolean; avisado: boolean };

export class Partida {
  private readonly mundo = new World(OPCIONES_MUNDO);
  private readonly secuencia: Secuencia;
  private readonly marcador: Marcador;
  /** Piezas soltadas que siguen en el mundo, en orden de soltado. */
  private soltadas: Soltada[] = [];
  private readonly colocadas: FormaColocada[] = [];
  /** Índice en la secuencia de cada pieza colocada (el guardado de C1 guarda solo esto). */
  private readonly indicesColocadas: number[] = [];
  private eventos: Evento[] = [];
  private faseActual: Fase = "apuntando";
  private pasosHechos = 0;
  private indice = 0;
  /**
   * Distancia recorrida por la pieza que cuelga hasta `pasoTramo`, el paso en
   * que cambió su velocidad por última vez (al colgarla o con el reloj, I1).
   * Desde ahí suma `velocidad · PASO` por paso: sin reloj da lo mismo que antes.
   */
  private distanciaTramo = 0;
  private pasoTramo = 0;
  private pasoSoltada = 0;
  private pasoCaida = 0;
  private enEspera: EnEspera | null = null;
  private colgadaY = 0;
  private readonly objetivoNivel: Objetivo | null;
  private victoria = false;
  /** Ritmo (B1): sube al soltar y baja al caer. */
  private ritmo = 0;
  private readonly velocidadInicial: number;
  /** Velocidad de la pieza que cuelga, fijada al colgarla. */
  private velocidadColgada = 0;
  private readonly semilla: string;
  private readonly conEspeciales: boolean;
  /** Cementos colocados con piezas por cementar en el siguiente `soltar()` (H2). */
  private cementos: CementoPendiente[] = [];
  private readonly modo: ModoPartida;
  /** Piezas que aún frena el reloj de arena, contando la que cuelga (I1). */
  private relojPiezas = 0;
  /** Piezas convertidas en cemento con el objeto (I1), por índice. */
  private readonly cementoUsado = new Set<number>();
  /** Ya se ha seguido una vez en esta partida (I1). */
  private seguida = false;

  constructor(semilla: string, opciones: OpcionesPartida = {}) {
    this.semilla = semilla;
    this.conEspeciales = opciones.especiales ?? true;
    this.modo = opciones.modo ?? "libre";
    this.secuencia = new Secuencia(semilla, { formas: opciones.formas });
    this.marcador = new Marcador(opciones.vidas ?? VIDAS_INICIALES);
    this.velocidadInicial = opciones.velocidad ?? VEL_INICIAL;
    this.objetivoNivel = opciones.objetivo ?? null;
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
    this.aplicarCementos();
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
    const soltada: Soltada = { pieza, cuerpo, fixture, cementada: false, especial: this.especialActual(), indice: this.indice };
    this.soltadas.push(soltada);
    this.ritmo = siguienteRitmo(this.ritmo, "soltada");
    if (this.relojPiezas > 0) this.relojPiezas--;
    this.enEspera = { indice: this.indice, calidad, soltada };
    this.eventos.push({ tipo: "soltada", paso: this.pasosHechos, indice: this.indice, calidad, x });
    this.faseActual = "esperando";
    this.pasoSoltada = this.pasosHechos;
    return true;
  }

  /**
   * Usa un objeto con la pieza que cuelga (I1, Anexo H). Devuelve `false` (y
   * no cambia nada) si no se puede: sin pieza colgando, en el reto diario
   * (R13), el reloj con otro activo o el cemento sobre una especial.
   * - Reloj: la pieza que cuelga y las `RELOJ_PIEZAS - 1` siguientes van a la
   *   velocidad × `RELOJ_MULT`. La que cuelga sigue desde donde está.
   * - Cemento: la pieza que cuelga pasa a ser de cemento (H2).
   */
  usar(objeto: Objeto): boolean {
    if (!this.puedeUsar(objeto)) return false;
    if (objeto === "reloj") {
      this.relojPiezas = RELOJ_PIEZAS;
      this.cambiarVelocidad(this.velocidadDeColgar());
      return true;
    }
    this.cementoUsado.add(this.indice);
    return true;
  }

  /** ¿Haría algo `usar(objeto)` ahora? La barra de objetos desactiva el botón si no (I3). */
  puedeUsar(objeto: Objeto): boolean {
    if (this.modo === "reto" || this.faseActual !== "apuntando") return false;
    return objeto === "reloj" ? this.relojPiezas <= 0 : this.especialActual() === null;
  }

  /**
   * Sigue tras perder la última vida (I1): solo en partida libre, una vez por
   * partida. Pone 1 vida, quita `RESPIRO_SEGUIR` al ritmo y cuelga la
   * siguiente pieza. Los puntos no cambian.
   */
  seguir(): boolean {
    if (this.modo !== "libre" || this.seguida || this.faseActual !== "fin" || this.victoria || this.marcador.vidas > 0) return false;
    this.seguida = true;
    this.marcador.seguir();
    this.ritmo = siguienteRitmo(this.ritmo, "seguir");
    this.colgarPieza();
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
        if (!this.revisarObjetivo()) this.colgarPieza();
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
      colgada:
        this.faseActual === "apuntando"
          ? conEspecial({ pieza, x: this.xColgada(), y: this.colgadaY, angulo: 0, velocidad: this.velocidadColgada }, this.especialActual())
          : null,
      cuerpos: this.soltadas.map(({ pieza, cuerpo, cementada, especial }) => {
        const p = cuerpo.getPosition();
        return conEspecial({ pieza, x: p.x, y: p.y, angulo: cuerpo.getAngle(), cementada }, especial);
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
      indices: [...this.indicesColocadas],
      piezas: m.piezas,
      perfectos: m.perfectos,
      comboMax: m.comboMax,
      vidas: m.vidas,
      monedas: m.monedas,
      doradas: m.doradas,
      terminada: this.terminada,
      victoria: this.victoria,
      pasos: this.pasosHechos,
      posiciones: this.soltadas.map(({ cuerpo }) => {
        const p = cuerpo.getPosition();
        return { x: p.x, y: p.y, angulo: cuerpo.getAngle() };
      }),
    };
  }

  /** Uniones de pegajosas que siguen en el mundo (H2, para las pruebas). */
  get uniones(): number {
    return this.mundo.getJointCount();
  }

  private piezaActual(): Pieza {
    return this.secuencia.pieza(this.indice);
  }

  /** Especial de la pieza que cuelga (H1). */
  private especialActual(): Especial | null {
    if (this.cementoUsado.has(this.indice)) return "cemento";
    return especialDe(this.semilla, this.indice, { especiales: this.conEspeciales });
  }

  /** Distancia recorrida por la pieza que cuelga hasta este paso. */
  private distanciaColgada(): number {
    return this.distanciaTramo + (this.pasosHechos - this.pasoTramo) * this.velocidadColgada * PASO;
  }

  private xColgada(): number {
    return posicionVaiven(this.distanciaColgada(), this.indice % 2 === 1);
  }

  /** Cambia la velocidad de la pieza que cuelga sin moverla: lo recorrido hasta aquí se guarda (I1). */
  private cambiarVelocidad(velocidad: number): void {
    this.distanciaTramo = this.distanciaColgada();
    this.pasoTramo = this.pasosHechos;
    this.velocidadColgada = velocidad;
  }

  /** Velocidad de la pieza que se cuelga con el ritmo, el combo y el reloj de ahora (B1, I1). */
  private velocidadDeColgar(): number {
    return velocidadDe(this.ritmo, { inicial: this.velocidadInicial, combo: this.marcador.combo, reloj: this.relojPiezas > 0 });
  }

  private objetivo(): number {
    return objetivoDe(
      this.sobrePlataforma().map((s) => ({ x: s.cuerpo.getPosition().x, cima: s.fixture.getAABB(0).upperBound.y })),
    );
  }

  /**
   * La pieza en espera cuenta como colocada: puntos, combo, vida extra e hitos,
   * y el efecto de su especial (H2): la dorada dobla sus puntos de colocada y da
   * monedas; la pegajosa se une a las piezas que toca; el cemento espera al
   * siguiente `soltar()`.
   */
  private colocarEnEspera(): void {
    const enEspera = this.enEspera;
    if (!enEspera) return;
    this.enEspera = null;
    const pieza = this.secuencia.pieza(enEspera.indice);
    const { especial } = enEspera.soltada;
    const { puntos, combo, vidaExtra } = this.marcador.colocar(enEspera.calidad, { dorada: especial === "dorada" });
    this.colocadas.push(conEspecial({ forma: pieza.forma, color: pieza.color, ancho: pieza.ancho, alto: pieza.alto }, especial));
    this.indicesColocadas.push(enEspera.indice);
    const paso = this.pasosHechos;
    this.eventos.push({ tipo: "colocada", paso, indice: enEspera.indice, calidad: enEspera.calidad, combo, puntos });
    if (especial === "dorada") this.eventos.push({ tipo: "especial", paso, especial, indice: enEspera.indice, efecto: MONEDAS_DORADA });
    else if (especial === "pegajosa") this.pegar(enEspera.soltada);
    else if (especial === "cemento") this.cementos.push({ indice: enEspera.indice, piezas: [], aplicado: false, avisado: false });
    if (vidaExtra) this.eventos.push({ tipo: "vidaExtra", paso, vidas: this.marcador.vidas });
    for (const metros of this.marcador.medirAltura(this.alturaTorre(this.sobrePlataforma()))) {
      this.eventos.push({ tipo: "hito", paso, metros });
    }
  }

  /**
   * Pegajosa colocada (H2): una `WeldJoint` con cada pieza que toca en ese
   * momento, nunca con la plataforma (impacto: así no hace de ancla). Se crea
   * fuera de `mundo.step`. Al retirar una pieza unida, `destroyBody` quita
   * también la unión.
   */
  private pegar(soltada: Soltada): void {
    const tocadas: Soltada[] = [];
    for (let borde = soltada.cuerpo.getContactList(); borde; borde = borde.next ?? null) {
      if (!borde.contact.isTouching()) continue;
      const otra = this.soltadas.find((s) => s.cuerpo === borde!.other);
      if (otra && otra !== soltada && !tocadas.includes(otra)) tocadas.push(otra);
    }
    // En el orden en que se soltaron: el orden de las uniones no depende de la lista de contactos.
    tocadas.sort((a, b) => this.soltadas.indexOf(a) - this.soltadas.indexOf(b));
    const ancla = soltada.cuerpo.getPosition();
    for (const otra of tocadas) this.mundo.createJoint(new WeldJoint({}, otra.cuerpo, soltada.cuerpo, new Vec2(ancla.x, ancla.y)));
    this.eventos.push({ tipo: "especial", paso: this.pasosHechos, especial: "pegajosa", indice: soltada.indice, efecto: tocadas.length });
  }

  /**
   * Cementos colocados (H2): al soltar la pieza siguiente, el cemento y todas
   * las piezas en pie con la cima por debajo de la suya pasan a piedra. Se hace
   * aquí, como `cementar` y por el mismo motivo, y no al colocarse. Las que aún
   * se mueven esperan a un `soltar()` en que estén quietas. Si el cemento ya no
   * está en pie (cayó en un episodio), no hace nada.
   */
  private aplicarCementos(): void {
    for (const cemento of this.cementos) {
      if (!cemento.aplicado) {
        const propia = this.soltadas.find((s) => s.indice === cemento.indice);
        if (propia && this.sigueEnPie(propia)) {
          const cima = propia.fixture.getAABB(0).upperBound.y;
          cemento.piezas = this.enPie().filter((s) => !s.cementada && s.fixture.getAABB(0).upperBound.y <= cima + 1e-9);
        }
      }
      cemento.piezas = cemento.piezas.filter((s) => !s.cementada && this.soltadas.includes(s) && this.sigueEnPie(s));
      let piezas = 0;
      for (const s of cemento.piezas) {
        if (s.cuerpo.isAwake() && !this.quieta(s)) continue;
        s.cuerpo.setType("static");
        s.cementada = true;
        piezas++;
      }
      cemento.piezas = cemento.piezas.filter((s) => !s.cementada);
      if (piezas > 0) this.eventos.push({ tipo: "cementada", paso: this.pasosHechos, piezas });
      if (!cemento.avisado && piezas > 0) {
        cemento.avisado = true;
        this.eventos.push({ tipo: "especial", paso: this.pasosHechos, especial: "cemento", indice: cemento.indice, efecto: piezas });
      }
      cemento.aplicado = true;
    }
    this.cementos = this.cementos.filter((c) => c.piezas.length > 0);
  }

  /**
   * Con objetivo de nivel, tras colocar una pieza (ya asentada): si se cumple,
   * la partida acaba con victoria; si ya no se puede cumplir, sin ella.
   * Devuelve si ha acabado.
   */
  private revisarObjetivo(): boolean {
    if (!this.objetivoNivel) return false;
    const m = this.marcador;
    const marca = { piezas: m.piezas, altura: this.alturaTorre(this.sobrePlataforma()), perfectos: m.perfectos, combo: m.combo, puntos: m.puntos };
    const estado = evaluarObjetivo(this.objetivoNivel, marca);
    if (estado === "sigue") return false;
    this.acabar(estado === "cumplido");
    return true;
  }

  private acabar(victoria: boolean): void {
    this.victoria = victoria;
    this.faseActual = "fin";
    this.eventos.push({ tipo: "fin", paso: this.pasosHechos, puntos: this.marcador.puntos, victoria });
  }

  /**
   * Fin de un episodio de caída (B1): retira, en el orden en que se soltaron, las
   * piezas caídas, las que quedan fuera de la plataforma y las que siguen
   * bajando deprisa, para que un derrumbe que aún resbala no cueste otra vida.
   * Resta una vida y da un respiro al ritmo; si quedan, cuelga la siguiente
   * pieza sobre lo que sigue en pie. La pieza que estaba en espera no puntúa.
   */
  private cerrarEpisodio(): void {
    const retirar = this.soltadas.filter((s) => !s.cementada && this.debeRetirarse(s));
    for (const s of retirar) this.mundo.destroyBody(s.cuerpo);
    this.soltadas = this.soltadas.filter((s) => !retirar.includes(s));
    const vidas = this.marcador.caer();
    this.ritmo = siguienteRitmo(this.ritmo, "caida");
    this.eventos.push({ tipo: "caida", paso: this.pasosHechos, vidas, perdidas: retirar.length });
    if (this.enEspera) {
      this.enEspera = null;
      this.indice++;
    }
    if (vidas <= 0) {
      this.acabar(false);
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

  /** Cuelga la pieza actual con la velocidad del ritmo, del combo y del reloj de ese momento (B1, I1). */
  private colgarPieza(): void {
    this.colgadaY = this.alturaTorre(this.enPie()) + HUECO_COLGADA + this.piezaActual().alto / 2;
    this.velocidadColgada = this.velocidadDeColgar();
    this.distanciaTramo = 0;
    this.pasoTramo = this.pasosHechos;
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
 * pieza (si cuelga alguna) antes de avanzar. Las `ayudas` de un paso se aplican
 * antes que su toque, en el orden de la lista; el seguir, en el paso en que
 * acabó la partida (I1). Sigue hasta que la partida acaba o se llega a
 * `opciones.maxPasos` (por defecto, el último toque o ayuda más
 * `MARGEN_PASOS`). Si una pieza ya ha caído, termina de asentar aunque pase el
 * límite, como la pantalla.
 */
export function jugar(semilla: string, toques: number[], opciones: OpcionesJugar = {}): Resultado {
  const { maxPasos, ayudas = [], ...deLaPartida } = opciones;
  const partida = new Partida(semilla, deLaPartida);
  const pendientes = new Set(toques);
  const porPaso = [...ayudas].sort((a, b) => a.paso - b.paso);
  const limite = maxPasos ?? Math.max(-1, ...toques, ...ayudas.map((a) => a.paso)) + 1 + MARGEN_PASOS;
  let siguiente = 0;
  for (;;) {
    for (; siguiente < porPaso.length && porPaso[siguiente]!.paso <= partida.pasos; siguiente++) {
      const { paso, tipo } = porPaso[siguiente]!;
      if (paso < partida.pasos) continue;
      if (tipo === "seguir") partida.seguir();
      else partida.usar(tipo);
    }
    if (partida.terminada || !(partida.pasos < limite || partida.fase === "asentando")) break;
    if (pendientes.has(partida.pasos)) partida.soltar();
    partida.paso();
    partida.tomarEventos();
  }
  return partida.resultado();
}
