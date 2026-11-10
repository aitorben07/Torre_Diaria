// Logo (G1, Anexo E con impacto §5, R-7): «TORRE» sobre «DIARIA» en
// Bricolage Grotesque 800, cada letra con un giro leve y fijo, como piezas
// apiladas, impresas en tinta con la doble impresión rosa y azul fuera de
// registro. La «O» es la pieza turquesa con ojos que cuelga del gancho y las
// dos «I» son pilas de dos piezas; debajo, el muelle con sus pilotes. Una sola
// geometría: `index.astro` la pinta como SVG en el HTML (sin `style="`, letras
// con la fuente de la página) y el favicon sale de aquí con trazados. No hay
// salida en canvas: la imagen para compartir mantiene su título de texto (R-7).
import { COLORES, type NombreColor } from "./temas.ts";

/** Ancho de avance de cada letra en Bricolage Grotesque 800, en fracción del tamaño (medido en Chromium). */
export const AVANCE: Readonly<Record<string, number>> = { T: 0.579, R: 0.688, E: 0.632, D: 0.705, A: 0.712 };
/** Alto de las mayúsculas, en fracción del tamaño. */
export const ALTO_MAYUSCULA = 0.66;

export type LetraLogo = { letra: string; x: number; base: number; tamano: number; giro: number };
export type PiezaLogo = { x: number; y: number; ancho: number; alto: number; giro: number; color: NombreColor; ojos: boolean };
export type Gancho = { x: number; y: number };

/** Lo que forma una línea: una letra o un hueco del ancho de una pieza, con el espacio que lo separa del anterior. */
type Elemento = { letra: string; espacio: number } | { pieza: number; espacio: number };

export const ANCHO_LOGO = 320;
export const ALTO_LOGO = 222;

const TORRE = { tamano: 88, base: 110 };
const DIARIA = { tamano: 80, base: 177 };
/** Giros de las letras en grados, de izquierda a derecha y de arriba abajo (Anexo E: entre −4 y 4, fijos). */
const GIROS = [-3, 2, -2, 3, 2, -3, 3, -2];

/** Centros de cada elemento de una línea, centrada en `ANCHO_LOGO`. */
function componer(elementos: readonly Elemento[], tamano: number): number[] {
  const anchos = elementos.map((e) => ("letra" in e ? AVANCE[e.letra]! * tamano : e.pieza));
  const total = anchos.reduce((suma, a) => suma + a, 0) + elementos.slice(1).reduce((suma, e) => suma + e.espacio, 0);
  let x = (ANCHO_LOGO - total) / 2;
  return anchos.map((ancho, i) => {
    if (i > 0) x += elementos[i]!.espacio;
    const centro = x + ancho / 2;
    x += ancho;
    return centro;
  });
}

function construir() {
  const lado = Math.round(ALTO_MAYUSCULA * TORRE.tamano) + 2;
  const linea1 = componer(
    [
      { letra: "T", espacio: 0 },
      { pieza: lado, espacio: 5 },
      { letra: "R", espacio: 5 },
      { letra: "R", espacio: -1 },
      { letra: "E", espacio: -1 },
    ],
    TORRE.tamano,
  );
  const anchoI = 28;
  const linea2 = componer(
    [
      { letra: "D", espacio: 0 },
      { pieza: anchoI, espacio: 4 },
      { letra: "A", espacio: 4 },
      { letra: "R", espacio: -1 },
      { pieza: anchoI, espacio: 4 },
      { letra: "A", espacio: 4 },
    ],
    DIARIA.tamano,
  );
  const giros = [...GIROS];
  const letra = (l: string, x: number, { tamano, base }: { tamano: number; base: number }): LetraLogo => ({ letra: l, x: redondear(x), base, tamano, giro: giros.shift()! });
  const letras: LetraLogo[] = [
    letra("T", linea1[0]!, TORRE),
    letra("R", linea1[2]!, TORRE),
    letra("R", linea1[3]!, TORRE),
    letra("E", linea1[4]!, TORRE),
    letra("D", linea2[0]!, DIARIA),
    letra("A", linea2[2]!, DIARIA),
    letra("R", linea2[3]!, DIARIA),
    letra("A", linea2[5]!, DIARIA),
  ];
  // La «O»: la pieza turquesa con ojos, del alto de las mayúsculas, colgada del gancho.
  const arribaO = TORRE.base - lado;
  const o: PiezaLogo = { x: redondear(linea1[1]! - lado / 2), y: arribaO, ancho: lado, alto: lado, giro: -4, color: "turquesa", ojos: true };
  // Las «I»: dos piezas apiladas, la de arriba con ojos.
  const altoI = Math.round(ALTO_MAYUSCULA * DIARIA.tamano);
  const pila = (centro: number, abajo: NombreColor, arriba: NombreColor, giros: [number, number]): PiezaLogo[] => [
    { x: redondear(centro - anchoI / 2), y: DIARIA.base - altoI / 2, ancho: anchoI, alto: altoI / 2, giro: giros[0], color: abajo, ojos: false },
    { x: redondear(centro - anchoI / 2 + 1), y: DIARIA.base - altoI, ancho: anchoI, alto: altoI / 2, giro: giros[1], color: arriba, ojos: true },
  ];
  const piezas = [o, ...pila(linea2[1]!, "amarillo", "rosa", [-2, 4]), ...pila(linea2[4]!, "violeta", "amarillo", [3, -3])];
  const gancho: Gancho = { x: redondear(linea1[1]!), y: arribaO - 10 };
  return { letras, piezas, gancho };
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}

export const LOGO = construir();

/** Muelle bajo «DIARIA»: tablero naranja, pilotes y olas. */
export const MUELLE = {
  tablero: { x: 14, y: 185, ancho: 292, alto: 10 },
  pilotes: [36, 92, 160, 228, 284],
  /** Dos filas de olas bajo el tablero, más cortas que él. */
  agua: `M26 207${"q6-4 12 0".repeat(22)}M50 216${"q6-4 12 0".repeat(18)}`,
};

/**
 * Pares de color del logo y su fondo, con el mínimo de contraste: letras
 * grandes (3:1) y contornos de las piezas (3:1, objetos gráficos).
 */
export const PARES_LOGO: ReadonlyArray<{ color: NombreColor; fondo: NombreColor; uso: string }> = [
  { color: "tinta", fondo: "papel", uso: "letras" },
  { color: "tinta", fondo: "amanecer", uso: "letras sobre el cielo del inicio" },
  { color: "tinta", fondo: "papel", uso: "contorno de las piezas" },
];

/**
 * Favicon (Anexo E): la pieza turquesa con ojos colgando del gancho sobre una
 * franja de muelle, sin texto (un `data:` no carga la fuente), en 32×32.
 */
export function faviconSvg(): string {
  const c = COLORES;
  return (
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
    `<rect width='32' height='32' rx='6' fill='${c.papel}'/>` +
    `<path d='M16 0v5' stroke='${c.tinta}' stroke-width='1.6'/>` +
    `<rect x='12.5' y='4' width='7' height='3' fill='${c.amarillo}' stroke='${c.tinta}' stroke-width='1'/>` +
    `<rect x='9.5' y='9.5' width='16' height='14' rx='2' fill='${c.rosa}'/>` +
    `<rect x='7.5' y='7.5' width='16' height='14' rx='2' fill='${c.turquesa}' stroke='${c.tinta}' stroke-width='1.6'/>` +
    `<circle cx='12.5' cy='13.5' r='1.7' fill='${c.tinta}'/><circle cx='18.5' cy='13.5' r='1.7' fill='${c.tinta}'/>` +
    `<rect x='2' y='25' width='28' height='3.5' fill='${c.naranja}' stroke='${c.tinta}' stroke-width='1.2'/>` +
    `<path d='M6 28.5V32M16 28.5V32M26 28.5V32' stroke='${c.tinta}' stroke-width='1.6'/>` +
    "</svg>"
  );
}
