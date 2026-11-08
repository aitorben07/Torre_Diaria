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
  /** Medallas del reto diario (D1). */
  plata: "#C3C7D4",
  bronce: "#D99A5E",
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
  { texto: "tinta", fondo: "plata", px: 14, uso: "medalla de plata" },
  { texto: "tinta", fondo: "bronce", px: 14, uso: "medalla de bronce" },
  { texto: "tinta", fondo: "turquesa", px: 14, uso: "pestaña elegida y congelador" },
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
 * Colores de las piezas y de su dibujo (A2). Los temas de la colección (C3)
 * son otras entradas de este tipo; `dibujo.ts` solo lee sus campos.
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
  /** Dibujo encima del color: vetas de madera, de mármol o rayas de caramelo. */
  textura?: { tipo: "madera" | "marmol" | "rayas"; color: string };
  /** Línea de luz por dentro del contorno (neón, oro). */
  filo?: string;
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

/** Madera (C3): tonos de pino, nogal y roble, con vetas. */
export const TEMA_MADERA: Tema = {
  id: "madera",
  nombre: "Madera",
  piezas: ["#D9984F", "#E8B86A", "#B5773D", "#8C5A2B", "#C98A4B", "#A86B35", "#7A4A22"],
  contorno: "#3B2414",
  trama: COLORES.papel,
  piedra: COLORES.piedra,
  ojos: true,
  textura: { tipo: "madera", color: "#5E3A1C" },
};

/** Caramelo (C3): pasteles con rayas de papel, como caramelos de feria. */
export const TEMA_CARAMELO: Tema = {
  id: "caramelo",
  nombre: "Caramelo",
  piezas: ["#FF8FB8", "#FFD36E", "#7FD8D2", "#9DB7FF", "#FFB08A", "#9EE6A8", "#C6A8FF"],
  contorno: "#5A2A4A",
  trama: COLORES.papel,
  piedra: "#E7C9C9",
  ojos: true,
  textura: { tipo: "rayas", color: COLORES.papel },
};

/** Neón (C3): tintas fluorescentes con un filo de luz. */
export const TEMA_NEON: Tema = {
  id: "neon",
  nombre: "Neón",
  piezas: ["#FF2E88", "#F2FF3A", "#00E5C7", "#3D7BFF", "#FF8A00", "#39FF6A", "#B44CFF"],
  contorno: "#120F24",
  trama: "#FFFFFF",
  piedra: "#6E6A86",
  ojos: true,
  filo: "#FFFFFF",
};

/** Mármol (C3): piedras claras con vetas grises; sin ojos, como estatuas. */
export const TEMA_MARMOL: Tema = {
  id: "marmol",
  nombre: "Mármol",
  piezas: ["#F1ECE4", "#DCD5CA", "#E9DFD3", "#CFD3D6", "#EADBD2", "#D7DDD3", "#DDD5E3"],
  contorno: "#3A3631",
  trama: "#FFFFFF",
  piedra: COLORES.piedra,
  ojos: false,
  textura: { tipo: "marmol", color: "#8F877C" },
};

/** Oro (C3): dorados con brillo. */
export const TEMA_ORO: Tema = {
  id: "oro",
  nombre: "Oro",
  piezas: ["#FFC93C", "#E8A92A", "#F5D76E", "#D4961F", "#FFE08A", "#C9881A", "#F0B84A"],
  contorno: "#3B2A0A",
  trama: COLORES.estrella,
  piedra: "#B79E6A",
  ojos: true,
  filo: COLORES.estrella,
};

/** Temas de piezas por id, en el orden del catálogo (C3). */
export const TEMAS_DIBUJO: readonly Tema[] = [TEMA_RISO, TEMA_MADERA, TEMA_CARAMELO, TEMA_NEON, TEMA_MARMOL, TEMA_ORO];

export function temaPorId(id: string): Tema {
  return TEMAS_DIBUJO.find((t) => t.id === id) ?? TEMA_RISO;
}

/**
 * Escenario (A2): cielo por alturas, mar, siluetas lejanas, nubes y muelle.
 * Los colores del cielo se reparten en un degradado que se crea al ajustar el
 * tamaño; las capas se pintan en lienzos aparte, también al ajustar.
 */
export type Escenario = {
  id: string;
  nombre: string;
  /** Qué hay en la capa lejana, qué sostiene la torre y qué hay debajo (C3). */
  lejos: "puerto" | "ciudad" | "nubes";
  suelo: "muelle" | "azotea" | "isla";
  mar: "agua" | "nubes";
  /** Sol de dos tintas, algo desplazadas. */
  sol: readonly [string, string];
  /** Color del cielo a cada altura en metros, de abajo arriba. */
  cielo: ReadonlyArray<{ metros: number; color: string }>;
  /** Mar opaco (azul riso al 35 % sobre papel) y espuma de las ondas. */
  agua: string;
  espuma: string;
  /** Grúas y barcos lejanos (azul riso al 40 %). */
  siluetas: string;
  nubes: string;
  /** Lo que sostiene la torre: cara de arriba, cara frontal y soportes (pilotes, fachada, roca). */
  superficie: string;
  frente: string;
  soportes: string;
  estrellas: string;
};

export const ESCENARIO_PUERTO: Escenario = {
  id: "puerto",
  nombre: "Puerto",
  lejos: "puerto",
  suelo: "muelle",
  mar: "agua",
  sol: [COLORES.amarillo, COLORES.rosa],
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
  superficie: COLORES.papelOscuro,
  frente: COLORES.naranja,
  soportes: COLORES.tinta,
  estrellas: COLORES.estrella,
};

/** Ciudad (C3, Anexo 1, 1.4): azoteas y depósitos de agua sobre un canal, al atardecer. */
export const ESCENARIO_CIUDAD: Escenario = {
  id: "ciudad",
  nombre: "Ciudad",
  lejos: "ciudad",
  suelo: "azotea",
  mar: "agua",
  sol: [COLORES.naranja, COLORES.rosa],
  cielo: [
    { metros: 0, color: COLORES.papel },
    { metros: 6, color: "#F8C9C2" },
    { metros: 14, color: "#F3B9C6" },
    { metros: 30, color: "#B9A7E3" },
    { metros: 60, color: "#3E3A7A" },
    { metros: 100, color: "#1A1840" },
  ],
  agua: mezclar(COLORES.papel, COLORES.turquesa, 0.42),
  espuma: COLORES.papel,
  siluetas: mezclar(COLORES.papel, COLORES.violeta, 0.45),
  nubes: COLORES.papel,
  superficie: COLORES.piedra,
  frente: "#D9694A",
  soportes: mezclar(COLORES.tinta, COLORES.violeta, 0.35),
  estrellas: COLORES.estrella,
};

/** Nubes (C3, Anexo 1, 1.4): islas flotantes sobre un mar de nubes. */
export const ESCENARIO_NUBES: Escenario = {
  id: "nubes",
  nombre: "Nubes",
  lejos: "nubes",
  suelo: "isla",
  mar: "nubes",
  sol: [COLORES.amarillo, COLORES.naranja],
  cielo: [
    { metros: 0, color: COLORES.papel },
    { metros: 6, color: "#D3EEE8" },
    { metros: 14, color: "#BFE4EC" },
    { metros: 30, color: "#8CC3EA" },
    { metros: 60, color: "#3E3A7A" },
    { metros: 100, color: "#1A1840" },
  ],
  agua: "#FBF6EC",
  espuma: COLORES.papelOscuro,
  siluetas: mezclar(COLORES.papel, COLORES.turquesa, 0.45),
  nubes: "#FBF6EC",
  superficie: COLORES.verde,
  frente: "#B8733F",
  soportes: "#8A6A55",
  estrellas: COLORES.estrella,
};

/** Escenarios por id, en el orden del catálogo (C3). */
export const ESCENARIOS_DIBUJO: readonly Escenario[] = [ESCENARIO_PUERTO, ESCENARIO_CIUDAD, ESCENARIO_NUBES];

export function escenarioPorId(id: string): Escenario {
  return ESCENARIOS_DIBUJO.find((e) => e.id === id) ?? ESCENARIO_PUERTO;
}

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
