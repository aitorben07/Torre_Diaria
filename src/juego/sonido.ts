// Sonido sintetizado con WebAudio (A4, Anexo 1, 1.6): sin archivos de audio.
// El `AudioContext` se crea o se reanuda en el primer gesto del usuario, nunca
// antes, y se suspende con la pestaña oculta. Hay una salida general con dos
// ramas (D1): la de los efectos, aquí, y la de la música (`musica.ts`). Con
// los efectos apagados no se crea ningún nodo de efectos; con efectos y música
// apagados, tampoco el contexto. En iPhone, el interruptor de silencio apaga
// WebAudio y no se fuerza (impacto §5).
//
// Desde la v3 los efectos son notas de marimba de la pentatónica de Do, la
// escala de la música (T6), con envolventes que empiezan y acaban en silencio:
// suenan con la música, no como ruidos.
import type { SalidaAudio } from "./musica.ts";

/** Volumen de los efectos (la música va a 0,25 y la general a 1). */
export const VOLUMEN = 0.5;
/** Escala pentatónica de Do del perfecto, por combo (1 a 6 o más). */
export const NOTAS_PERFECTO = [523, 587, 659, 784, 880, 1047] as const;
/** Las tres notas de las estrellas de nivel: Sol, La y Do, dentro de la escala (impacto §5). */
export const NOTAS_ESTRELLA = [784, 880, 1047] as const;
/** Notas de los demás efectos, de la misma pentatónica: Do 3, Sol 3, Do 4, Mi 4, Sol 4 y Mi 5. */
const DO3 = 131;
const SOL3 = 196;
const DO4 = 262;
const MI4 = 330;
const SOL4 = 392;
const MI5 = 659;
/** Todas las frecuencias que tocan los efectos, para comprobar que están en la escala. */
export const NOTAS_EFECTOS = [DO3, SOL3, DO4, MI4, SOL4, MI5, ...NOTAS_PERFECTO, ...NOTAS_ESTRELLA] as const;

/** Frecuencia de la nota del perfecto: sube con el combo y se queda en la sexta. */
export function notaPerfecto(combo: number): number {
  const i = Math.min(NOTAS_PERFECTO.length, Math.max(1, Math.floor(combo))) - 1;
  return NOTAS_PERFECTO[i]!;
}

export class Sonido {
  private ctx: AudioContext | null = null;
  /** Salida general (volumen 1) y la rama de los efectos (`VOLUMEN`). */
  private general: GainNode | null = null;
  private salida: GainNode | null = null;
  private ruido: AudioBuffer | null = null;
  private conEfectos = true;
  private conMusica = true;
  private creando = false;

  /** ¿Están encendidos los efectos («Sonidos» en Ajustes)? */
  get activo(): boolean {
    return this.conEfectos;
  }

  get musica(): boolean {
    return this.conMusica;
  }

  /** Enciende o apaga los efectos. Apagados, no se crea ningún nodo de efectos. */
  cambiar(activo: boolean): void {
    this.conEfectos = activo;
    this.ajustarContexto(activo);
  }

  /** Enciende o apaga la rama de la música (las notas las programa `Musica`). */
  cambiarMusica(activa: boolean): void {
    this.conMusica = activa;
    this.ajustarContexto(activa);
  }

  /**
   * Con todo apagado el contexto se suspende; al encender algo, se despierta.
   * Apagar solo una parte no lo toca: así, al abrir la página con algo
   * apagado, no se crea el contexto antes del primer gesto.
   */
  private ajustarContexto(encendiendo: boolean): void {
    if (!this.conEfectos && !this.conMusica) void this.ctx?.suspend().catch(() => undefined);
    else if (encendiendo) this.despertar();
  }

  /** En cada gesto del usuario: crea el contexto la primera vez y lo reanuda si estaba parado. */
  despertar(): void {
    if ((!this.conEfectos && !this.conMusica) || document.hidden) return;
    if (!this.ctx) {
      // Abrir el dispositivo de audio puede tardar (segundos en algunos equipos
      // Windows): se hace justo después del gesto, no dentro, para que el toque
      // suelte la pieza sin esperar. Con la activación del gesto ya hecha, el
      // contexto puede sonar; en iPhone quizá solo desde el segundo toque.
      if (!this.creando) {
        this.creando = true;
        setTimeout(() => this.crear(), 0);
      }
      return;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
  }

  /** Crea el contexto, la salida general y la de los efectos (una sola vez). */
  private crear(): void {
    this.creando = false;
    if (this.ctx || (!this.conEfectos && !this.conMusica)) return;
    const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    try {
      this.ctx = new Contexto();
    } catch {
      return;
    }
    this.general = this.ctx.createGain();
    this.general.gain.value = 1;
    this.general.connect(this.ctx.destination);
    this.salida = this.ctx.createGain();
    this.salida.gain.value = VOLUMEN;
    this.salida.connect(this.general);
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
  }

  /** Con la pestaña oculta se para con la partida; al volver, se reanuda si hay algo encendido. */
  visibilidad(oculta: boolean): void {
    if (!this.ctx) return;
    if (oculta) void this.ctx.suspend().catch(() => undefined);
    else if (this.conEfectos || this.conMusica) void this.ctx.resume().catch(() => undefined);
  }

  /** Contexto y salida general para la música, o `null` (apagada, sin gesto, suspendido o sin WebAudio). */
  paraMusica(): SalidaAudio | null {
    if (!this.conMusica || !this.ctx || !this.general || this.ctx.state !== "running") return null;
    return { ctx: this.ctx, destino: this.general };
  }

  /** Contexto listo para los efectos, o `null` (apagados, sin gesto o sin WebAudio). */
  private listo(): { ctx: AudioContext; salida: GainNode } | null {
    if (!this.conEfectos || !this.ctx || !this.salida || this.ctx.state !== "running") return null;
    return { ctx: this.ctx, salida: this.salida };
  }

  /**
   * Un tono con envolvente de percusión: sube en `ataque` segundos y cae en
   * `caida`, de silencio a silencio. Con `hasta` distinto de `desde`, la altura se desliza.
   */
  private tono(desde: number, hasta: number, inicio: number, ataque: number, caida: number, volumen: number): void {
    const l = this.listo();
    if (!l) return;
    const t = l.ctx.currentTime + inicio;
    const osc = l.ctx.createOscillator();
    const env = l.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(desde, t);
    if (hasta !== desde) osc.frequency.exponentialRampToValueAtTime(hasta, t + ataque + caida);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volumen, t + ataque);
    env.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
    osc.connect(env).connect(l.salida);
    osc.start(t);
    osc.stop(t + ataque + caida + 0.02);
  }

  /** Nota de marimba, como la de la música: seno con un parcial suave a ×4 que se apaga antes. */
  private marimba(f: number, inicio: number, caida: number, volumen: number): void {
    this.tono(f, f, inicio, 0.005, caida, volumen);
    this.tono(f * 4, f * 4, inicio, 0.003, Math.min(0.1, caida / 3), volumen * 0.12);
  }

  /** Agua: ruido con un paso bajo que se cierra de `desde` a `hasta` Hz, muy suave. */
  private agua(desde: number, hasta: number, duracion: number, volumen: number): void {
    const l = this.listo();
    if (!l) return;
    if (!this.ruido) {
      this.ruido = l.ctx.createBuffer(1, Math.round(l.ctx.sampleRate * 0.5), l.ctx.sampleRate);
      const datos = this.ruido.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    }
    const t = l.ctx.currentTime;
    const fuente = l.ctx.createBufferSource();
    fuente.buffer = this.ruido;
    const filtro = l.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.setValueAtTime(desde, t);
    filtro.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
    const env = l.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volumen, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    fuente.connect(filtro).connect(env).connect(l.salida);
    fuente.start(t);
    fuente.stop(t + duracion + 0.02);
  }

  /** Soltar: una marimba corta y bajita en Mi 5, 90 ms. */
  tic(): void {
    this.marimba(MI5, 0, 0.09, 0.16);
  }

  /** Aterrizar: golpe de madera afinado, de Sol 3 a Do 3 en 140 ms, con un toque de marimba en Do 4. */
  toc(): void {
    this.tono(SOL3, DO3, 0, 0.004, 0.14, 0.45);
    this.marimba(DO4, 0, 0.07, 0.12);
  }

  /** Perfecto: la nota de la pentatónica según el combo, en marimba con un brillo a la octava, 350 ms. */
  perfecto(combo: number): void {
    const f = notaPerfecto(combo);
    this.marimba(f, 0, 0.35, 0.3);
    this.tono(f * 2, f * 2, 0.01, 0.01, 0.25, 0.06);
  }

  /** Vida extra: arpegio de Do, Mi, Sol y Do agudo. */
  vidaExtra(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.marimba(f, i * 0.07, 0.28, 0.24));
  }

  /** Hito: Sol y Do agudo. */
  hito(): void {
    this.marimba(784, 0, 0.2, 0.24);
    this.marimba(1047, 0.11, 0.35, 0.24);
  }

  /** Caída: Sol, Mi y Do que bajan despacio, sobre un chapoteo suave. */
  caida(): void {
    [SOL4, MI4, DO4].forEach((f, i) => this.marimba(f, i * 0.1, i === 2 ? 0.45 : 0.18, 0.26));
    this.agua(900, 150, 0.35, 0.12);
  }

  /** Estrella de nivel número `n` (1 a 3): cada una, una nota más alta (Sol, La y Do, E3). */
  estrella(n: number): void {
    const f = NOTAS_ESTRELLA[Math.min(2, Math.max(0, n - 1))]!;
    this.marimba(f, 0, 0.3, 0.28);
    this.tono(f * 2, f * 2, 0.01, 0.01, 0.22, 0.06);
  }

  /** Récord (y nivel ganado, impacto §5): arpegio ascendente con el Do agudo largo. */
  record(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.marimba(f, i * 0.07, i === 3 ? 0.5 : 0.2, 0.26));
  }
}
