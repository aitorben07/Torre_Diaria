import { describe, expect, it } from "vitest";
import { ANTICIPACION_S, capaMusical, CAPA_INICIO, Musica, VOLUMEN_MUSICA, type SalidaAudio } from "./musica.ts";
import { CORCHEAS, INICIO, PARTIDA } from "./partituras.ts";
import { segundosCorchea } from "./secuenciador.ts";

/** Parámetro de audio falso: guarda el valor y acepta las rampas; `alCaer` avisa de cada `setTargetAtTime`. */
function parametro(valor = 1, alCaer: (v: number) => void = () => undefined) {
  const p = {
    value: valor,
    setValueAtTime: (v: number) => ((p.value = v), p),
    linearRampToValueAtTime: () => p,
    exponentialRampToValueAtTime: () => p,
    setTargetAtTime: (v: number) => (alCaer(v), p),
    cancelScheduledValues: () => p,
  };
  return p;
}

/** `AudioContext` falso con reloj a mano: cuenta los nodos y los osciladores que se arrancan, con su momento. */
function contextoFalso() {
  const cuenta = { nodos: 0, arranques: [] as number[], desconectados: 0, caidasACero: 0 };
  const nodo = (extra: Record<string, unknown> = {}) => {
    cuenta.nodos++;
    const n = {
      ...extra,
      connect: (destino: unknown) => destino,
      disconnect: () => void cuenta.desconectados++,
    };
    return n;
  };
  const fuente = () =>
    nodo({
      type: "sine",
      frequency: parametro(440),
      detune: parametro(0),
      buffer: null,
      setPeriodicWave: () => undefined,
      start: (t: number) => void cuenta.arranques.push(t),
      stop: () => undefined,
    });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createGain: () => nodo({ gain: parametro(1, (v) => void (v === 0 && cuenta.caidasACero++)) }),
    createBiquadFilter: () => nodo({ type: "lowpass", frequency: parametro(350), Q: parametro(1) }),
    createOscillator: fuente,
    createBufferSource: fuente,
    createBuffer: (_c: number, largo: number, sampleRate: number) => ({ sampleRate, getChannelData: () => new Float32Array(largo) }),
    createPeriodicWave: () => ({}),
  };
  const salida: SalidaAudio = { ctx: ctx as unknown as BaseAudioContext, destino: nodo() as unknown as AudioNode };
  cuenta.nodos = 0;
  return { ctx, salida, cuenta };
}

/** Avanza el reloj de audio a fotogramas de `paso` segundos, llamando a `programar` en cada uno. */
function fotogramas(musica: Musica, ctx: { currentTime: number }, segundos: number, paso = 1 / 60): void {
  const hasta = ctx.currentTime + segundos;
  while (ctx.currentTime < hasta - 1e-9) {
    ctx.currentTime += paso;
    musica.programar();
  }
}

describe("capa de la música (D3, Anexo F con R-2)", () => {
  it("da la tabla: 0 al empezar; 1 desde 5 m o combo 2; 2 con combo 4 o 2,6 m/s; y una menos tras una caída", () => {
    const capa = (combo: number, altura: number, velocidad: number, caidaReciente = false) => capaMusical({ combo, altura, velocidad, caidaReciente });
    expect(capa(0, 0, 1.3)).toBe(0);
    expect(capa(1, 4.9, 2.59)).toBe(0);
    expect(capa(0, 5, 1.3)).toBe(1);
    expect(capa(2, 0, 1.3)).toBe(1);
    expect(capa(3, 12, 2)).toBe(1);
    expect(capa(4, 0, 1.3)).toBe(2);
    expect(capa(0, 0, 2.6)).toBe(2);
    expect(capa(9, 40, 3.4)).toBe(2);
    expect(capa(4, 0, 1.3, true)).toBe(1);
    expect(capa(2, 0, 1.3, true)).toBe(0);
    expect(capa(0, 0, 1.3, true)).toBe(0);
  });
});

describe("música programada desde el bucle de fotogramas (D1)", () => {
  it("sin contexto en marcha no crea nada, pero dice qué pista toca", () => {
    const musica = new Musica(() => null);
    musica.programar();
    expect(musica.notas).toBe(0);
    expect(musica.etiqueta).toBe(`inicio:${CAPA_INICIO}`);
    musica.poner("partida");
    expect(musica.etiqueta).toBe("partida:0");
  });

  it("apagada no crea ningún nodo", () => {
    const { ctx, salida, cuenta } = contextoFalso();
    const musica = new Musica(() => salida);
    musica.cambiar(false);
    fotogramas(musica, ctx, 10);
    expect(cuenta.nodos).toBe(0);
    expect(musica.notas).toBe(0);
  });

  it("cada nota se programa como mucho 0,2 s antes de sonar y ninguna llega tarde", () => {
    const { ctx, salida, cuenta } = contextoFalso();
    const musica = new Musica(() => salida);
    let peor = 0;
    let antes = 0;
    for (let i = 0; i < 60 * 30; i++) {
      // Fotogramas irregulares, como con carga: de 16 a 60 ms.
      ctx.currentTime += i % 7 === 0 ? 0.06 : 1 / 60;
      musica.programar();
      for (const t of cuenta.arranques.slice(antes)) {
        expect(t).toBeGreaterThanOrEqual(ctx.currentTime);
        peor = Math.max(peor, t - ctx.currentTime);
      }
      antes = cuenta.arranques.length;
    }
    expect(musica.notas).toBeGreaterThan(50);
    expect(peor).toBeLessThanOrEqual(ANTICIPACION_S + 0.05);
  });

  it("en la pausa y con la pestaña oculta no programa ninguna nota nueva; al seguir, vuelve a sonar", () => {
    const { ctx, salida } = contextoFalso();
    const musica = new Musica(() => salida);
    musica.poner("partida");
    fotogramas(musica, ctx, 3);
    musica.pausar(true);
    fotogramas(musica, ctx, 0.3);
    const enPausa = musica.notas;
    fotogramas(musica, ctx, 2);
    expect(musica.notas).toBe(enPausa);
    musica.pausar(false);
    musica.ocultar(true);
    fotogramas(musica, ctx, 2);
    expect(musica.notas).toBe(enPausa);
    musica.ocultar(false);
    fotogramas(musica, ctx, 2);
    expect(musica.notas).toBeGreaterThan(enPausa);
  });

  it("del inicio a la partida cambia al empezar el compás, y la capa de la partida también", () => {
    const { ctx, salida } = contextoFalso();
    const musica = new Musica(() => salida);
    const compasInicio = CORCHEAS * segundosCorchea(INICIO.bpm);
    fotogramas(musica, ctx, compasInicio / 2);
    expect(musica.etiqueta).toBe("inicio:1");
    musica.poner("partida");
    musica.pedirCapa({ combo: 4, altura: 0, velocidad: 1.3 });
    // Lo que queda del compás del inicio sigue sonando como inicio.
    fotogramas(musica, ctx, compasInicio / 2 - 0.3);
    expect(musica.etiqueta).toBe("inicio:1");
    fotogramas(musica, ctx, 0.4);
    expect(musica.etiqueta).toBe("partida:2");
  });

  it("tras una caída, la capa baja una durante 2 compases y luego vuelve", () => {
    const { ctx, salida } = contextoFalso();
    const musica = new Musica(() => salida);
    musica.poner("partida");
    const compas = CORCHEAS * segundosCorchea(PARTIDA.bpm);
    musica.pedirCapa({ combo: 4, altura: 10, velocidad: 1.5 });
    fotogramas(musica, ctx, compas * 1.5);
    expect(musica.etiqueta).toBe("partida:2");
    musica.caida();
    musica.pedirCapa({ combo: 0, altura: 10, velocidad: 1.5 });
    fotogramas(musica, ctx, compas);
    expect(musica.etiqueta).toBe("partida:0");
    fotogramas(musica, ctx, compas * 1.5);
    musica.pedirCapa({ combo: 0, altura: 10, velocidad: 1.5 });
    fotogramas(musica, ctx, compas);
    expect(musica.etiqueta).toBe("partida:1");
  });

  it("al acabar, el motivo de fin empieza en el pulso siguiente y la pista deja de programar", () => {
    const { ctx, salida, cuenta } = contextoFalso();
    const musica = new Musica(() => salida);
    musica.poner("partida");
    fotogramas(musica, ctx, 1);
    const ahora = ctx.currentTime;
    const antes = cuenta.arranques.length;
    musica.poner("fin");
    fotogramas(musica, ctx, 1 / 60);
    const motivo = cuenta.arranques.slice(antes);
    const negra = 60 / PARTIDA.bpm;
    expect(motivo.length).toBeGreaterThan(0);
    expect(Math.min(...motivo)).toBeGreaterThan(ahora);
    expect(Math.min(...motivo)).toBeLessThanOrEqual(ahora + negra + 0.05);
    const conMotivo = musica.notas;
    fotogramas(musica, ctx, 5);
    expect(musica.notas).toBe(conMotivo);
    expect(musica.etiqueta).toBe("fin:0");
  });

  it("al apagarla sin salida suelta la sesión y, al encenderla 10 min después, no da de golpe lo que faltaba", () => {
    const { ctx, salida, cuenta } = contextoFalso();
    let conMusica = true;
    // Como `Sonido.paraMusica()`: con la música apagada, la salida es `null`.
    const musica = new Musica(() => (conMusica ? salida : null));
    musica.poner("partida");
    fotogramas(musica, ctx, 10);
    musica.cambiar(false);
    conMusica = false;
    fotogramas(musica, ctx, 1);
    ctx.currentTime += 600;
    const notas = musica.notas;
    const nodos = cuenta.nodos;
    musica.cambiar(true);
    conMusica = true;
    fotogramas(musica, ctx, 1 / 60);
    expect(musica.notas - notas).toBeLessThan(8);
    expect(cuenta.nodos - nodos).toBeLessThan(40);
  });

  it("al apagarla con el contexto en marcha (los Sonidos siguen), la corta con su caída y no la suelta de golpe", () => {
    const { ctx, salida, cuenta } = contextoFalso();
    let conMusica = true;
    // Como el interruptor de Ajustes: `Musica` se apaga primero y `Sonido` deja de dar salida justo después.
    const musica = new Musica(() => (conMusica ? salida : null));
    musica.poner("partida");
    fotogramas(musica, ctx, 10);
    musica.cambiar(false);
    conMusica = false;
    fotogramas(musica, ctx, 1);
    expect(cuenta.caidasACero).toBe(1);
    expect(cuenta.desconectados).toBe(0);
    // Con la salida de vuelta, la sesión cortada (ya muda) se suelta.
    conMusica = true;
    fotogramas(musica, ctx, 1 / 60);
    expect(cuenta.desconectados).toBe(1);
  });

  it("si el contexto se suspende a mitad de pista, al volver sigue por su compás sin notas atrasadas", () => {
    const { ctx, salida, cuenta } = contextoFalso();
    let enMarcha = true;
    const musica = new Musica(() => (enMarcha ? salida : null));
    musica.poner("partida");
    fotogramas(musica, ctx, 10);
    enMarcha = false;
    fotogramas(musica, ctx, 30);
    const antes = cuenta.arranques.length;
    enMarcha = true;
    fotogramas(musica, ctx, 1 / 60);
    for (const t of cuenta.arranques.slice(antes)) expect(t).toBeGreaterThanOrEqual(ctx.currentTime);
    expect(cuenta.arranques.length - antes).toBeLessThan(8);
    expect(musica.etiqueta).toMatch(/^partida:/);
  });

  it("la salida de la música va a 0,25 y se suelta al cortarla", () => {
    const { ctx, salida, cuenta } = contextoFalso();
    expect(VOLUMEN_MUSICA).toBe(0.25);
    const musica = new Musica(() => salida);
    fotogramas(musica, ctx, 1);
    musica.cambiar(false);
    fotogramas(musica, ctx, 1);
    expect(cuenta.desconectados).toBe(1);
  });
});
