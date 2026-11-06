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

/** Nombre de la variable CSS de cada color: `papelOscuro` → `--papel-oscuro`. */
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
