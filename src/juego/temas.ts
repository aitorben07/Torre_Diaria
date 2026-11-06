// Paleta «Riso» (Anexo 1, 1.2), temas de piezas y escenarios. La misma tabla
// da los colores del lienzo y las variables de `estilos.css` (una prueba
// comprueba que coinciden), así que un color se cambia en los dos sitios.

/** Colores de tinta y papel de la interfaz. En CSS: `--papel`, `--tinta`, etc. */
export const COLORES = {
  papel: "#F3EAD7",
  papelOscuro: "#E2D3B5",
  tinta: "#1E1B33",
  rosa: "#FF4F8B",
  amarillo: "#FFC93C",
  turquesa: "#12A4A0",
  azul: "#2F5DDB",
  naranja: "#FF7A3D",
  verde: "#3BB273",
  violeta: "#7A5CC7",
  piedra: "#B9AE98",
  estrella: "#FFF3C4",
} as const;

export type NombreColor = keyof typeof COLORES;

/** Tipografía del lienzo; hasta que carga, el lienzo no escribe texto (impacto, A3). */
export const FAMILIA = '"Bricolage Grotesque Variable", system-ui, sans-serif';

/** Nombre de la variable CSS de cada color: `papelOscuro` da `--papel-oscuro`. */
export function variableCss(nombre: NombreColor): string {
  return `--${nombre.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}`;
}

/**
 * Pares de texto y fondo que usa la interfaz, con el tamaño mínimo del texto
 * en px. WCAG pide 4,5:1 para texto normal y 3:1 desde 24 px (A1).
 */
export const PARES_TEXTO: ReadonlyArray<{ texto: NombreColor; fondo: NombreColor; px: number; uso: string }> = [
  { texto: "tinta", fondo: "papel", px: 14, uso: "textos y paneles" },
  { texto: "tinta", fondo: "papelOscuro", px: 14, uso: "tarjeta de texto" },
  { texto: "tinta", fondo: "rosa", px: 16, uso: "botón principal" },
  { texto: "tinta", fondo: "amarillo", px: 14, uso: "avisos destacados y combo" },
  { texto: "papel", fondo: "tinta", px: 16, uso: "aviso del primer toque" },
  { texto: "tinta", fondo: "estrella", px: 14, uso: "récord" },
];

/** Luminancia relativa WCAG de un color `#RRGGBB`. */
export function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Mezcla `a` con `b` en proporción `t` (0 = `a`, 1 = `b`). Colores `#RRGGBB`. */
export function mezclar(a: string, b: string, t: number): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  const partes = [1, 3, 5].map((i) => Math.round(canal(a, i) + (canal(b, i) - canal(a, i)) * t));
  return `#${partes.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** El color oscurecido en `t` (0,35 = 35 % más oscuro), para la sombra de impresión. */
export function oscurecer(hex: string, t: number): string {
  return mezclar(hex, "#000000", t);
}

/**
 * Colores de las piezas y de su dibujo (A2). El bloque C añade temas sin tocar
 * `dibujo.ts`: basta con otra entrada de este tipo.
 */
export type Tema = {
  id: string;
  nombre: string;
  /** Un color por índice de `PALETA` de `piezas.ts` (7). */
  piezas: readonly string[];
  /** Contorno y ojos. */
  contorno: string;
  /** Puntos de la trama de la mitad superior. */
  trama: string;
  /** Piezas cementadas de la base. */
  piedra: string;
  /** Bloque y cuadrado con ojos. */
  ojos: boolean;
};

export const TEMA_RISO: Tema = {
  id: "riso",
  nombre: "Riso",
  piezas: [COLORES.rosa, COLORES.amarillo, COLORES.turquesa, COLORES.azul, COLORES.naranja, COLORES.verde, COLORES.violeta],
  contorno: COLORES.tinta,
  trama: COLORES.papel,
  piedra: COLORES.piedra,
  ojos: true,
};

/**
 * Escenario (A2): cielo por alturas, mar, siluetas lejanas, nubes y muelle.
 * Los colores del cielo se reparten en un degradado que se crea al ajustar el
 * tamaño; las capas se pintan en lienzos aparte, también al ajustar.
 */
export type Escenario = {
  id: string;
  nombre: string;
  /** Color del cielo a cada altura en metros, de abajo arriba. */
  cielo: ReadonlyArray<{ metros: number; color: string }>;
  /** Mar opaco (azul riso al 35 % sobre papel) y espuma de las ondas. */
  agua: string;
  espuma: string;
  /** Grúas y barcos lejanos (azul riso al 40 %). */
  siluetas: string;
  nubes: string;
  /** Tablas del muelle, su cara frontal y los pilotes. */
  madera: string;
  maderaFrente: string;
  pilotes: string;
  estrellas: string;
};

export const ESCENARIO_PUERTO: Escenario = {
  id: "puerto",
  nombre: "Puerto",
  cielo: [
    { metros: 0, color: COLORES.papel },
    { metros: 6, color: "#FBD9C0" },
    { metros: 14, color: "#FBD9C0" },
    { metros: 30, color: "#9ED3E0" },
    { metros: 60, color: "#3E3A7A" },
    { metros: 100, color: "#1A1840" },
  ],
  agua: mezclar(COLORES.papel, COLORES.azul, 0.35),
  espuma: COLORES.papel,
  siluetas: mezclar(COLORES.papel, COLORES.azul, 0.4),
  nubes: COLORES.papel,
  madera: COLORES.papelOscuro,
  maderaFrente: COLORES.naranja,
  pilotes: COLORES.tinta,
  estrellas: COLORES.estrella,
};

/** Color del cielo a `metros` de altura, interpolado entre las paradas del escenario. */
export function colorCielo(escenario: Escenario, metros: number): string {
  const paradas = escenario.cielo;
  if (metros <= paradas[0]!.metros) return paradas[0]!.color;
  for (let i = 1; i < paradas.length; i++) {
    const a = paradas[i - 1]!;
    const b = paradas[i]!;
    if (metros <= b.metros) return mezclar(a.color, b.color, (metros - a.metros) / (b.metros - a.metros));
  }
  return paradas[paradas.length - 1]!.color;
}
