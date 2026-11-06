// Sonido sintetizado con WebAudio (A4, Anexo 1, 1.6): sin archivos de audio.
// El `AudioContext` se crea o se reanuda en el primer gesto del usuario, nunca
// antes, y se suspende con la pestaña oculta. Con el sonido apagado no se crea
// ningún nodo. En iPhone, el interruptor de silencio apaga WebAudio.

/** Volumen general. */
export const VOLUMEN = 0.5;
/** Escala pentatónica de Do del perfecto, por combo (1 a 6 o más). */
export const NOTAS_PERFECTO = [523, 587, 659, 784, 880, 1047] as const;

/** Frecuencia de la nota del perfecto: sube con el combo y se queda en la sexta. */
export function notaPerfecto(combo: number): number {
  const i = Math.min(NOTAS_PERFECTO.length, Math.max(1, Math.floor(combo))) - 1;
  return NOTAS_PERFECTO[i]!;
}

type Onda = "sine" | "triangle" | "square" | "sawtooth";

export class Sonido {
  private ctx: AudioContext | null = null;
  private salida: GainNode | null = null;
  private ruido: AudioBuffer | null = null;
  private encendido = true;

  get activo(): boolean {
    return this.encendido;
  }

  /** Enciende o apaga. Apagado, no se crea ningún nodo y el contexto se suspende. */
  cambiar(activo: boolean): void {
    this.encendido = activo;
    if (!activo) void this.ctx?.suspend().catch(() => undefined);
    else this.despertar();
  }

  /** En cada gesto del usuario: crea el contexto la primera vez y lo reanuda si estaba parado. */
  despertar(): void {
    if (!this.encendido || document.hidden) return;
    if (!this.ctx) {
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Contexto) return;
      try {
        this.ctx = new Contexto();
      } catch {
        return;
      }
      this.salida = this.ctx.createGain();
      this.salida.gain.value = VOLUMEN;
      this.salida.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => undefined);
  }

  /** Con la pestaña oculta se para con la partida; al volver, se reanuda si está encendido. */
  visibilidad(oculta: boolean): void {
    if (!this.ctx) return;
    if (oculta) void this.ctx.suspend().catch(() => undefined);
    else if (this.encendido) void this.ctx.resume().catch(() => undefined);
  }

  /** Contexto listo para sonar, o `null` (apagado, sin gesto o sin WebAudio). */
  private listo(): { ctx: AudioContext; salida: GainNode } | null {
    if (!this.encendido || !this.ctx || !this.salida || this.ctx.state !== "running") return null;
    return { ctx: this.ctx, salida: this.salida };
  }

  private tono(onda: Onda, desde: number, hasta: number, inicio: number, duracion: number, volumen: number): void {
    const l = this.listo();
    if (!l) return;
    const t = l.ctx.currentTime + inicio;
    const osc = l.ctx.createOscillator();
    const env = l.ctx.createGain();
    osc.type = onda;
    osc.frequency.setValueAtTime(desde, t);
    if (hasta !== desde) osc.frequency.exponentialRampToValueAtTime(hasta, t + duracion);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(volumen, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    osc.connect(env).connect(l.salida);
    osc.start(t);
    osc.stop(t + duracion + 0.02);
  }

  /** Ruido blanco con filtro paso bajo que va de `desde` a `hasta` Hz. */
  private soplo(desde: number, hasta: number, duracion: number, volumen: number): void {
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
    env.gain.setValueAtTime(volumen, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    fuente.connect(filtro).connect(env).connect(l.salida);
    fuente.start(t);
    fuente.stop(t + duracion + 0.02);
  }

  /** Soltar: «tic» triangular de 660 Hz, 40 ms. */
  tic(): void {
    this.tono("triangle", 660, 660, 0, 0.04, 0.25);
  }

  /** Aterrizar: «toc» de 180 a 120 Hz en 90 ms con ruido filtrado a 800 Hz. */
  toc(): void {
    this.tono("sine", 180, 120, 0, 0.09, 0.6);
    this.soplo(800, 300, 0.06, 0.25);
  }

  /** Perfecto: nota de la pentatónica según el combo, triangular más seno a la octava, 180 ms. */
  perfecto(combo: number): void {
    const f = notaPerfecto(combo);
    this.tono("triangle", f, f, 0, 0.18, 0.35);
    this.tono("sine", f * 2, f * 2, 0, 0.18, 0.15);
  }

  /** Vida extra: arpegio de 523, 659 y 784 Hz. */
  vidaExtra(): void {
    [523, 659, 784].forEach((f, i) => this.tono("triangle", f, f, i * 0.08, 0.14, 0.3));
  }

  /** Hito: dos notas, 784 y 1047 Hz. */
  hito(): void {
    this.tono("triangle", 784, 784, 0, 0.12, 0.3);
    this.tono("triangle", 1047, 1047, 0.11, 0.2, 0.3);
  }

  /** Caída: ruido con barrido de 600 a 80 Hz en 400 ms y un seno grave de 90 Hz. */
  caida(): void {
    this.soplo(600, 80, 0.4, 0.5);
    this.tono("sine", 90, 70, 0, 0.4, 0.5);
  }

  /** Récord: arpegio ascendente. */
  record(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tono("triangle", f, f, i * 0.07, 0.16, 0.3));
  }
}
