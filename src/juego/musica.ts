// Música (D1 y D3, Anexo F con impacto §5): sintetizada con WebAudio a partir de
// las partituras de `partituras.ts`, sin archivos. No tiene temporizador
// propio: la página llama a `programar()` en cada fotograma y aquí se crean los
// nodos de las notas que caen en los próximos `ANTICIPACION_S` segundos. Si el
// fotograma llega tarde, la nota ya está programada en el reloj del audio y
// suena a tiempo.
//
// Cada vez que la música arranca se crea una «sesión»: su salida con el filtro
// de la caída y un filtro (o ganancia) por instrumento, una sola vez. Cada nota
// es un oscilador (o un ruido) y su envolvente, nada más: con menos nodos, el
// móvil emulado pierde menos fotogramas (D4). Al
// pausar, ocultar la pestaña, apagarla o acabar la partida, la sesión se
// apaga en un instante y se suelta: las notas que ya estaban programadas
// suenan en una salida muda.
import { frecuencia, MOTIVO_FIN, PISTAS, type Instrumento, type NombrePista, type NotaMotivo } from "./partituras.ts";
import { Secuenciador } from "./secuenciador.ts";

/** Segundos que se programan por delante del reloj de audio (impacto §5: 0,2 s). */
export const ANTICIPACION_S = 0.2;
/** Volumen de la música: siempre por debajo de los efectos (0,5). */
export const VOLUMEN_MUSICA = 0.25;
/** Tras una caída, el filtro de la música baja a esta frecuencia y vuelve en `COMPASES_CAIDA` compases. */
export const FILTRO_CAIDA_HZ = 600;
export const COMPASES_CAIDA = 2;
/** Frecuencia del filtro de la música cuando está abierto. */
const FILTRO_ABIERTO_HZ = 12000;
/** Altura y combo desde los que entra cada capa (D3 con R-2: capas 0 a 2). */
export const ALTURA_CAPA_1 = 5;
export const COMBO_CAPA_1 = 2;
export const COMBO_CAPA_2 = 4;
export const VELOCIDAD_CAPA_2 = 2.6;
/** Capa de la música del inicio: colchón, marimba y bajo, sin percusión. */
export const CAPA_INICIO = 1;

/** Lo que suena: una pista en bucle, el motivo de fin o nada (la victoria usa `sonido.record()`). */
export type Tema = NombrePista | "fin" | "silencio";

/**
 * Capa de la música en la partida (D3, Anexo F sin la capa 3):
 * 0, colchón y marimba; 1, más el bajo, desde 5 m o combo 2; 2, más la
 * percusión, con combo 4 o velocidad de 2,6 m/s. Tras una caída, una menos.
 */
export function capaMusical({ combo, altura, velocidad, caidaReciente }: { combo: number; altura: number; velocidad: number; caidaReciente: boolean }): number {
  let capa = 0;
  if (altura >= ALTURA_CAPA_1 || combo >= COMBO_CAPA_1) capa = 1;
  if (combo >= COMBO_CAPA_2 || velocidad >= VELOCIDAD_CAPA_2) capa = 2;
  return caidaReciente ? Math.max(0, capa - 1) : capa;
}

/** Contexto y nodo al que se conecta la música (la salida general de `Sonido`). */
export type SalidaAudio = { ctx: BaseAudioContext; destino: AudioNode };

/** Volumen de cada instrumento dentro de la salida de la música. */
const VOLUMEN: Record<Instrumento, number> = { marimba: 0.7, bajo: 0.65, colchon: 0.17, bombo: 0.7, cepillo: 0.12 };

type Sesion = {
  salida: GainNode;
  filtro: BiquadFilterNode;
  entradas: Record<Instrumento, AudioNode>;
  /** Onda de la marimba: el seno y su parcial a ×4 en un solo oscilador. */
  marimba: PeriodicWave;
  /** Hasta cuándo suena (al cortarla), para soltarla después. */
  hasta: number;
};

export class Musica {
  private encendida = true;
  private tema: Tema = "inicio";
  private pausada = false;
  private oculta = false;
  private capaPedida = CAPA_INICIO;
  private sesion: Sesion | null = null;
  private secuenciador: Secuenciador | null = null;
  private finPendiente = false;
  /** Compás por el que iba la pista al cortarla, para seguir por él (pausa, pestaña oculta). */
  private reanudar: { pista: NombrePista; compas: number } | null = null;
  private cortadas: Sesion[] = [];
  private ruido: AudioBuffer | null = null;
  private caidaHasta = -1;
  /** Notas programadas desde que se abrió la página (`data-notas`, para las pruebas). */
  notas = 0;

  constructor(private readonly salida: () => SalidaAudio | null) {}

  get activa(): boolean {
    return this.encendida;
  }

  /**
   * Enciende o apaga. Apagada no se crea ningún nodo de música. Al apagarla se
   * corta ya, con su caída corta, mientras aún hay salida: justo después
   * `Sonido` deja de darla y soltarla de golpe chascaría a mitad de las notas.
   */
  cambiar(activa: boolean): void {
    this.encendida = activa;
    if (activa) return;
    this.reanudar = null;
    const s = this.sesion ? this.salida() : null;
    if (s) this.cortar(s, s.ctx.currentTime);
  }

  /** Pista o motivo que toca. Las pistas cambian al empezar el compás; el fin, en el pulso siguiente. */
  poner(tema: Tema): void {
    if (tema === this.tema) return;
    this.tema = tema;
    this.finPendiente = tema === "fin";
    this.reanudar = null;
    if (tema === "inicio") this.capaPedida = CAPA_INICIO;
    if (tema === "partida") this.capaPedida = 0;
  }

  /** En la pausa de la partida (o con un panel encima) la música se para; al seguir, retoma su compás desde el principio. */
  pausar(pausada: boolean): void {
    this.pausada = pausada;
  }

  /** Con la pestaña oculta, como en la pausa. */
  ocultar(oculta: boolean): void {
    this.oculta = oculta;
  }

  /** Capa que pide la partida en este fotograma (D3); se aplica al empezar el compás. */
  pedirCapa(estado: { combo: number; altura: number; velocidad: number }): void {
    if (this.tema !== "partida") return;
    const ahora = this.salida()?.ctx.currentTime ?? 0;
    this.capaPedida = capaMusical({ ...estado, caidaReciente: ahora < this.caidaHasta });
  }

  /** Una pieza al mar: la música «se hunde» con la torre durante 2 compases y la capa baja una. */
  caida(): void {
    const s = this.salida();
    if (!s || !this.sesion || !this.secuenciador) return;
    const t = s.ctx.currentTime;
    const vuelta = COMPASES_CAIDA * this.secuenciador.duracionCompas;
    this.caidaHasta = t + vuelta;
    const f = this.sesion.filtro.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(FILTRO_CAIDA_HZ, t + 0.15);
    f.exponentialRampToValueAtTime(FILTRO_ABIERTO_HZ, t + vuelta);
  }

  /**
   * «pista:capa» para `data-musica`: lo que suena, que cambia al empezar el
   * compás, o lo que tocaría aunque el contexto aún no exista (impacto §5).
   */
  get etiqueta(): string {
    if (this.secuenciador) return `${this.secuenciador.nombre}:${this.secuenciador.capa}`;
    return `${this.tema}:${this.tema === "partida" || this.tema === "inicio" ? this.capaPedida : 0}`;
  }

  /** En cada fotograma: arranca, corta o programa lo que toque en los próximos 0,2 s. */
  programar(): void {
    const s = this.salida();
    if (!s) {
      // Sin contexto en marcha (antes del primer gesto, apagada o suspendido): nada que programar,
      // y el motivo de fin ya no toca: sonaría tarde. La sesión se suelta ya (no suena) y el
      // secuenciador también: si siguiera, al volver daría de golpe todo lo que faltaba.
      this.finPendiente = false;
      this.soltarSesion();
      return;
    }
    this.programarEn(s, s.ctx.currentTime);
  }

  /** Lo mismo que `programar`, con el contexto y la hora dados (también para grabar con `OfflineAudioContext`). */
  programarEn(s: SalidaAudio, ahora: number): void {
    this.soltarCortadas(ahora);
    const pista = this.tema === "inicio" || this.tema === "partida" ? this.tema : null;
    const suena = this.encendida && !this.pausada && !this.oculta;
    if (this.finPendiente) {
      this.finPendiente = false;
      if (this.encendida && !this.oculta) {
        const t = this.secuenciador ? this.secuenciador.siguientePulso(ahora + 0.02) : ahora + 0.05;
        this.cortar(s, t);
        this.motivo(s, MOTIVO_FIN, t);
      }
    }
    if (!pista || !suena) {
      if (this.sesion) {
        if (pista && this.secuenciador) this.reanudar = { pista, compas: this.secuenciador.compas };
        this.cortar(s, ahora);
      }
      return;
    }
    if (!this.sesion || !this.secuenciador) {
      const desde = this.reanudar?.pista === pista ? this.reanudar.compas : 0;
      this.reanudar = null;
      this.sesion = this.abrirSesion(s);
      this.secuenciador = new Secuenciador(PISTAS[pista], ahora + 0.05, this.capaPedida, desde);
    }
    const sec = this.secuenciador;
    if (sec.nombre !== pista) sec.pedirPista(PISTAS[pista]);
    sec.capaPedida = this.capaPedida;
    for (const nota of sec.notas(ahora + ANTICIPACION_S, ahora)) this.tocar(s.ctx, this.sesion, nota.instrumento, nota.midi, nota.tiempo, nota.duracion, nota.volumen);
  }

  /** Suelta la sesión sin contexto y guarda el compás si la música sigue encendida, para seguir por él. */
  private soltarSesion(): void {
    const pista = this.tema === "inicio" || this.tema === "partida" ? this.tema : null;
    if (pista && this.encendida && this.secuenciador?.nombre === pista) this.reanudar = { pista, compas: this.secuenciador.compas };
    this.sesion?.filtro.disconnect();
    this.sesion = null;
    this.secuenciador = null;
  }

  /** Salida de la sesión: un filtro por instrumento, el de la caída y el volumen de la música. */
  private abrirSesion(s: SalidaAudio): Sesion {
    const { ctx } = s;
    const salida = ctx.createGain();
    salida.gain.value = VOLUMEN_MUSICA;
    // El filtro de la caída va el último, justo antes de la salida general.
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = FILTRO_ABIERTO_HZ;
    salida.connect(filtro).connect(s.destino);
    const pasoBajo = (hz: number) => {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = hz;
      f.connect(salida);
      return f;
    };
    const directa = () => {
      const g = ctx.createGain();
      g.connect(salida);
      return g;
    };
    const cepillo = ctx.createBiquadFilter();
    cepillo.type = "highpass";
    cepillo.frequency.value = 6000;
    cepillo.connect(salida);
    return {
      salida,
      filtro,
      // Bajo redondo a 600 Hz y colchón tenue a 1,2 kHz (Anexo F); la marimba y el bombo, directos.
      entradas: { marimba: directa(), bajo: pasoBajo(600), colchon: pasoBajo(1200), bombo: directa(), cepillo },
      // Seno con el parcial a ×4 al 12 % (Anexo F: 15 %, algo menos porque aquí no se apaga antes).
      marimba: ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0, 0, 0.12])),
      hasta: Infinity,
    };
  }

  /** Apaga la sesión en `t` con una caída corta (sin chasquido) y la deja para soltarla cuando calle. */
  private cortar(s: SalidaAudio, t: number): void {
    const sesion = this.sesion;
    this.sesion = null;
    this.secuenciador = null;
    if (!sesion) return;
    const g = sesion.salida.gain;
    g.cancelScheduledValues(s.ctx.currentTime);
    g.setValueAtTime(VOLUMEN_MUSICA, Math.max(s.ctx.currentTime, t));
    g.setTargetAtTime(0, Math.max(s.ctx.currentTime, t), 0.06);
    sesion.hasta = t + 0.6;
    this.cortadas.push(sesion);
  }

  private soltarCortadas(ahora: number): void {
    if (this.cortadas.length === 0) return;
    this.cortadas = this.cortadas.filter((sesion) => {
      if (ahora < sesion.hasta) return true;
      sesion.filtro.disconnect();
      return false;
    });
  }

  /** Un motivo suelto (el de fin) en una salida propia que se suelta al acabar. */
  private motivo(s: SalidaAudio, notas: readonly NotaMotivo[], t: number): void {
    const sesion = this.abrirSesion(s);
    for (const n of notas) this.tocar(s.ctx, sesion, n.instrumento, n.midi, t + n.tiempo, n.duracion, n.volumen);
    sesion.hasta = t + 3;
    this.cortadas.push(sesion);
  }

  /** Crea los nodos de una nota. Las envolventes empiezan y acaban en silencio: nada chasca. */
  private tocar(ctx: BaseAudioContext, sesion: Sesion, instrumento: Instrumento, midi: number, t: number, duracion: number, acento: number): void {
    this.notas++;
    const volumen = VOLUMEN[instrumento] * acento;
    const entrada = sesion.entradas[instrumento];
    if (instrumento === "marimba") {
      // Ataque de 5 ms y caída exponencial, más larga en las notas largas (Anexo F).
      const caida = Math.min(0.9, Math.max(0.35, duracion * 0.9));
      this.parcial(ctx, entrada, sesion.marimba, frecuencia(midi), t, 0.005, caida, volumen);
    } else if (instrumento === "bajo") {
      this.parcial(ctx, entrada, "triangle", frecuencia(midi), t, 0.012, Math.min(0.6, duracion + 0.1), volumen);
    } else if (instrumento === "colchon") {
      // Triangular con subida lenta. Cada nota del acorde va desafinada -6, 0 o
      // +6 centésimas: entre ellas baten un poco, como un conjunto (Anexo F).
      const env = ctx.createGain();
      const subida = Math.min(0.4, duracion / 3);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(volumen, t + subida);
      env.gain.setValueAtTime(volumen, t + duracion - 0.05);
      env.gain.linearRampToValueAtTime(0, t + duracion + 0.35);
      env.connect(entrada);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = frecuencia(midi);
      osc.detune.value = ((midi % 3) - 1) * 6;
      osc.connect(env);
      osc.start(t);
      osc.stop(t + duracion + 0.4);
    } else if (instrumento === "bombo") {
      // Seno de 120 a 50 Hz en 120 ms.
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(volumen, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(env).connect(entrada);
      osc.start(t);
      osc.stop(t + 0.18);
    } else {
      // Cepillo: ruido por el paso alto de 6 kHz, 30 ms.
      const fuente = ctx.createBufferSource();
      fuente.buffer = this.ruidoDe(ctx);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(volumen, t + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      fuente.connect(env).connect(entrada);
      fuente.start(t);
      fuente.stop(t + 0.06);
    }
  }

  /** Oscilador con envolvente de percusión: sube en `ataque` y cae en `caida` segundos. */
  private parcial(ctx: BaseAudioContext, entrada: AudioNode, onda: OscillatorType | PeriodicWave, f: number, t: number, ataque: number, caida: number, volumen: number): void {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    if (typeof onda === "string") osc.type = onda as OscillatorType;
    else osc.setPeriodicWave(onda);
    osc.frequency.value = f;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volumen, t + ataque);
    env.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
    osc.connect(env).connect(entrada);
    osc.start(t);
    osc.stop(t + ataque + caida + 0.02);
  }

  /** Medio segundo de ruido para el cepillo, creado una vez por contexto. */
  private ruidoDe(ctx: BaseAudioContext): AudioBuffer {
    if (!this.ruido || this.ruido.sampleRate !== ctx.sampleRate) {
      this.ruido = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.5), ctx.sampleRate);
      const datos = this.ruido.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    }
    return this.ruido;
  }
}
