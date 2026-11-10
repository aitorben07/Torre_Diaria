// Secuenciador de la música (D1): puro, sin WebAudio ni reloj propio. La página
// le pide en cada fotograma las notas que caen antes de `ahora + anticipación`
// (impacto §5: sin temporizador, desde el bucle de fotogramas) y él lleva la
// cuenta de por dónde va, así que con ventanas de cualquier tamaño da cada nota
// una sola vez, sin huecos ni repetidas. La capa y la pista que se piden solo
// cambian al empezar un compás.
import { CORCHEAS, type Instrumento, type Pista } from "./partituras.ts";

/** Nota lista para sonar: momento y duración en segundos del reloj de audio. */
export type NotaProgramada = {
  instrumento: Instrumento;
  midi: number;
  tiempo: number;
  duracion: number;
  volumen: number;
  /** Compás de la pista (desde 0) y posición de la nota en él, para las pruebas. */
  compas: number;
  indice: number;
};

/** Segundos de una corchea a `bpm`. */
export function segundosCorchea(bpm: number): number {
  return 30 / bpm;
}

/** Segundos desde el principio del compás hasta la corchea `corchea`, con el vaivén de la pista. */
export function momentoDe(pista: Pista, corchea: number): number {
  const pulso = Math.floor(corchea / 2);
  const desplazamiento = corchea % 2 === 1 ? pista.swing : 0;
  return (pulso + desplazamiento) * 2 * segundosCorchea(pista.bpm);
}

export class Secuenciador {
  private pista: Pista;
  private compasActual: number;
  private inicioCompas: number;
  private siguiente = 0;
  private capaDelCompas: number;
  private pistaPedida: Pista | null = null;
  /** Capa que se aplicará al empezar el compás siguiente. */
  capaPedida: number;

  /** Empieza `pista` en el compás `compas` en el momento `inicio` (segundos del reloj de audio). */
  constructor(pista: Pista, inicio: number, capa: number, compas = 0) {
    this.pista = pista;
    this.inicioCompas = inicio;
    this.compasActual = compas % pista.compases.length;
    this.capaDelCompas = capa;
    this.capaPedida = capa;
  }

  get nombre(): Pista["nombre"] {
    return this.pista.nombre;
  }

  /** Compás que suena ahora (desde 0) y su capa. */
  get compas(): number {
    return this.compasActual;
  }

  get capa(): number {
    return this.capaDelCompas;
  }

  /** Segundos que dura un compás de la pista que suena. */
  get duracionCompas(): number {
    return CORCHEAS * segundosCorchea(this.pista.bpm);
  }

  /** Cambia de pista al empezar el compás siguiente, desde su primer compás. */
  pedirPista(pista: Pista): void {
    this.pistaPedida = pista === this.pista ? null : pista;
  }

  /** Primer pulso (negra) que empieza en `ahora` o después. */
  siguientePulso(ahora: number): number {
    const negra = 2 * segundosCorchea(this.pista.bpm);
    const pulsos = Math.ceil(Math.max(0, ahora - this.inicioCompas) / negra - 1e-9);
    return this.inicioCompas + pulsos * negra;
  }

  /**
   * Las notas que empiezan antes de `hasta` y aún no se han dado, en orden. Las
   * que empezaban antes de `desde` (un fotograma muy tardío) se saltan: sonarían
   * tarde y todas a la vez.
   */
  notas(hasta: number, desde = -Infinity): NotaProgramada[] {
    const salida: NotaProgramada[] = [];
    for (;;) {
      const compas = this.pista.compases[this.compasActual]!;
      while (this.siguiente < compas.notas.length) {
        const nota = compas.notas[this.siguiente]!;
        const tiempo = this.inicioCompas + momentoDe(this.pista, nota.corchea);
        if (tiempo >= hasta) return salida;
        if (nota.capa <= this.capaDelCompas && tiempo >= desde) {
          salida.push({
            instrumento: nota.instrumento,
            midi: nota.midi,
            tiempo,
            duracion: nota.duracion * segundosCorchea(this.pista.bpm),
            volumen: nota.volumen,
            compas: this.compasActual,
            indice: this.siguiente,
          });
        }
        this.siguiente++;
      }
      // El compás siguiente empieza cuando acaba este: ahí se aplican capa y pista pedidas.
      const fin = this.inicioCompas + this.duracionCompas;
      if (fin >= hasta) return salida;
      this.inicioCompas = fin;
      this.siguiente = 0;
      this.capaDelCompas = this.capaPedida;
      if (this.pistaPedida) {
        this.pista = this.pistaPedida;
        this.pistaPedida = null;
        this.compasActual = 0;
      } else {
        this.compasActual = (this.compasActual + 1) % this.pista.compases.length;
      }
    }
  }
}
