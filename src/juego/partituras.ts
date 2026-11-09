// Partituras de la música (D2, Anexo F con impacto §5 y recorte R-2).
//
// Autoría y licencia: composición original hecha para Torre Diaria y escrita
// aquí como datos. No usa muestras ni melodías de terceros; queda en el mismo
// régimen que el resto del código del juego.
//
// Todo está en Do mayor: la melodía, en la pentatónica del perfecto (Do, Re,
// Mi, Sol y La, `NOTAS_PERFECTO` en `sonido.ts`), y el bajo y el colchón, en
// las notas del acorde de su compás (Do, La menor, Fa y Sol). Así los efectos
// nunca desafinan con la música (T6). Compases de 4/4 contados en corcheas.

export type Instrumento = "marimba" | "bajo" | "colchon" | "bombo" | "cepillo";
export type Acorde = "C" | "Am" | "F" | "G";
export type NombrePista = "inicio" | "partida";

/** Corcheas de un compás de 4/4. */
export const CORCHEAS = 8;
/** Notas de la pentatónica de Do, como clase de altura (0 = Do). */
export const ESCALA = [0, 2, 4, 7, 9] as const;
/** Clases de altura de cada acorde. */
export const ACORDES: Record<Acorde, readonly number[]> = { C: [0, 4, 7], Am: [9, 0, 4], F: [5, 9, 0], G: [7, 11, 2] };
/** Colchón: el acorde en posición cerrada alrededor del Do central (MIDI). */
const COLCHON: Record<Acorde, readonly number[]> = { C: [60, 64, 67], Am: [57, 60, 64], F: [57, 60, 65], G: [55, 59, 62] };

/** Una nota de la partitura: en qué corchea del compás empieza, cuántas dura y desde qué capa suena (D3). */
export type NotaPartitura = {
  instrumento: Instrumento;
  /** Altura MIDI (60 = Do central); en la percusión no cuenta. */
  midi: number;
  corchea: number;
  duracion: number;
  /** De 0 a 1: acento dentro del volumen del instrumento. */
  volumen: number;
  capa: number;
};

export type Compas = { acorde: Acorde; notas: readonly NotaPartitura[] };

export type Pista = {
  nombre: NombrePista;
  /** Tempo fijo (R-2). */
  bpm: number;
  /** Dónde cae la corchea de contratiempo dentro del pulso: 0,5 es recto; algo más, un poco de vaivén. */
  swing: number;
  compases: readonly Compas[];
};

const NOMBRES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** «E5» → 76. */
export function midiDe(nombre: string): number {
  const m = /^([A-G])(\d)$/.exec(nombre);
  if (!m) throw new Error(`Nota no válida: ${nombre}`);
  return NOMBRES[m[1]!]! + 12 * (Number(m[2]) + 1);
}

/** Frecuencia en Hz de una altura MIDI (La 440). */
export function frecuencia(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Melodía de un compás en 8 casillas de corchea: una nota («E5»), «-» que
 * alarga la anterior o «.» de silencio. El primer tiempo de cada pulso suena
 * un poco más fuerte.
 */
function melodia(casillas: string): NotaPartitura[] {
  const partes = casillas.split(/\s+/);
  if (partes.length !== CORCHEAS) throw new Error(`Compás de ${partes.length} corcheas: ${casillas}`);
  const notas: NotaPartitura[] = [];
  partes.forEach((parte, corchea) => {
    if (parte === "-") {
      const ultima = notas.at(-1);
      if (ultima && ultima.corchea + ultima.duracion === corchea) ultima.duracion++;
      return;
    }
    if (parte === ".") return;
    const volumen = corchea % 4 === 0 ? 1 : corchea % 2 === 0 ? 0.85 : 0.72;
    notas.push({ instrumento: "marimba", midi: midiDe(parte), corchea, duracion: 1, volumen, capa: 0 });
  });
  return notas;
}

type Grado = "raiz" | "quinta" | "octava";
/** Bajo: en qué corchea, qué grado del acorde y cuántas corcheas. */
type PatronBajo = ReadonlyArray<readonly [number, Grado, number]>;

/** Raíz del bajo entre Fa 2 y Do 3 (MIDI 41 a 48): se oye en un altavoz pequeño gracias a los armónicos de la triangular. */
function raiz(acorde: Acorde): number {
  const clase = ACORDES[acorde][0]!;
  return clase + 36 < 41 ? clase + 48 : clase + 36;
}

function bajo(acorde: Acorde, patron: PatronBajo): NotaPartitura[] {
  const r = raiz(acorde);
  return patron.map(([corchea, grado, duracion]) => ({
    instrumento: "bajo" as const,
    midi: grado === "raiz" ? r : grado === "quinta" ? r + 7 : r + 12,
    corchea,
    duracion,
    volumen: corchea === 0 ? 1 : 0.8,
    capa: 1,
  }));
}

function colchon(acorde: Acorde): NotaPartitura[] {
  return COLCHON[acorde].map((midi) => ({ instrumento: "colchon" as const, midi, corchea: 0, duracion: CORCHEAS, volumen: 1, capa: 0 }));
}

/** Percusión suave de la capa 2: bombo en el 1 y el 3, cepillo en cada corchea, más marcado en el 2 y el 4. */
function percusion(): NotaPartitura[] {
  const notas: NotaPartitura[] = [];
  for (let corchea = 0; corchea < CORCHEAS; corchea++) {
    if (corchea % 4 === 0) notas.push({ instrumento: "bombo", midi: 0, corchea, duracion: 1, volumen: 1, capa: 2 });
    else notas.push({ instrumento: "cepillo", midi: 0, corchea, duracion: 1, volumen: corchea % 4 === 2 ? 1 : 0.45, capa: 2 });
  }
  return notas;
}

/** Compases a partir de los acordes y la melodía, con el bajo y, si toca, la percusión. Notas ordenadas por corchea. */
function compases(lineas: ReadonlyArray<readonly [Acorde, string]>, patronBajo: PatronBajo, conPercusion: boolean): Compas[] {
  return lineas.map(([acorde, casillas]) => {
    const notas = [...colchon(acorde), ...bajo(acorde, patronBajo), ...melodia(casillas), ...(conPercusion ? percusion() : [])];
    return { acorde, notas: notas.sort((a, b) => a.corchea - b.corchea) };
  });
}

/**
 * Inicio: 16 compases a 88 BPM (unos 44 s), tranquila, con notas largas.
 * Dos frases de 8: la primera pregunta y acaba en Sol; la segunda sube y vuelve.
 */
export const INICIO: Pista = {
  nombre: "inicio",
  bpm: 88,
  swing: 0.6,
  compases: compases(
    [
      ["C", "E5 - - D5 C5 - - ."],
      ["Am", "A4 - - - . . C5 D5"],
      ["F", "C5 - - - A4 - G4 -"],
      ["G", "D5 - - - . . . ."],
      ["C", "E5 - - G5 - - E5 -"],
      ["Am", "A5 - - - E5 - D5 -"],
      ["F", "C5 - - - A4 - C5 D5"],
      ["G", "D5 - - - - - . ."],
      ["F", "A4 - C5 - A4 - G4 -"],
      ["C", "G4 - - - E5 - D5 -"],
      ["Am", "C5 - - - E5 - A5 -"],
      ["G", "G5 - - - D5 - - ."],
      ["F", "A5 - G5 - C5 - D5 -"],
      ["C", "E5 - - - G5 - E5 -"],
      ["F", "C5 - D5 - A4 - C5 -"],
      ["G", "D5 - - - . . . ."],
    ],
    [
      [0, "raiz", 4],
      [4, "quinta", 4],
    ],
    false,
  ),
};

/** Las dos frases que se repiten en la partida (compases 9 a 15 y 25 a 31). */
const FRASE_A: ReadonlyArray<readonly [Acorde, string]> = [
  ["C", "G4 C5 E5 - G5 - E5 -"],
  ["G", "D5 - - E5 D5 - G4 -"],
  ["Am", "A4 C5 E5 - A5 - G5 E5"],
  ["F", "C5 - - - A4 - C5 D5"],
  ["C", "E5 - G5 A5 G5 - E5 -"],
  ["G", "D5 - E5 - G5 - D5 -"],
  ["F", "C5 - - A4 C5 - D5 -"],
];

/**
 * Partida: 32 compases a 104 BPM (unos 74 s) en forma A A' B A', para que no
 * canse en partidas de varios minutos. A acaba en Sol y deja la frase abierta;
 * A' cierra en Do; B sube al registro agudo con notas más largas.
 */
export const PARTIDA: Pista = {
  nombre: "partida",
  bpm: 104,
  swing: 0.56,
  compases: compases(
    [
      ["C", "G4 C5 E5 - G5 - E5 -"],
      ["G", "D5 - - E5 D5 - G4 -"],
      ["Am", "A4 C5 E5 - A5 - G5 E5"],
      ["F", "C5 - - - A4 - . ."],
      ["C", "G4 C5 E5 - G5 - A5 G5"],
      ["G", "G5 - - E5 D5 - E5 -"],
      ["F", "C5 - A4 - C5 - D5 -"],
      ["G", "D5 - - - . . . ."],
      ...FRASE_A,
      ["C", "C5 - - - . . . ."],
      ["F", "A5 - - G5 A5 - - ."],
      ["G", "G5 - - - D5 - E5 -"],
      ["C", "E5 - - - G5 - E5 C5"],
      ["Am", "A4 - - - C5 - E5 -"],
      ["F", "A5 - - G5 A5 - G5 -"],
      ["G", "G5 - - E5 D5 - - ."],
      ["Am", "E5 - - D5 C5 - D5 E5"],
      ["G", "D5 - - - G4 - - ."],
      ...FRASE_A,
      ["C", "C5 - - - . . . ."],
    ],
    [
      [0, "raiz", 2],
      [3, "raiz", 1],
      [4, "quinta", 2],
      [6, "octava", 2],
    ],
    true,
  ),
};

export const PISTAS: Record<NombrePista, Pista> = { inicio: INICIO, partida: PARTIDA };

/** Nota suelta con su momento en segundos, para los motivos que no van en bucle. */
export type NotaMotivo = { instrumento: Instrumento; midi: number; tiempo: number; duracion: number; volumen: number };

/** Motivo de fin (D2): Sol, Mi y Do de la marimba sobre el acorde de Do; 1,5 s. */
export const MOTIVO_FIN: readonly NotaMotivo[] = [
  { instrumento: "marimba", midi: midiDe("G5"), tiempo: 0, duracion: 0.3, volumen: 0.9 },
  { instrumento: "marimba", midi: midiDe("E5"), tiempo: 0.22, duracion: 0.3, volumen: 0.85 },
  { instrumento: "marimba", midi: midiDe("C5"), tiempo: 0.44, duracion: 0.9, volumen: 1 },
  { instrumento: "bajo", midi: midiDe("C3"), tiempo: 0.44, duracion: 0.9, volumen: 0.9 },
  ...COLCHON.C.map((midi) => ({ instrumento: "colchon" as const, midi, tiempo: 0.44, duracion: 1, volumen: 0.8 })),
];

/** Lo que dura una pista entera a su tempo, en segundos. */
export function duracionPista(pista: Pista): number {
  return (pista.compases.length * CORCHEAS * 30) / pista.bpm;
}
