// Catálogo de la colección (C3, Anexo 1, 4.4 y 5, con el recorte I1 de
// impacto): 6 temas de piezas que se compran con monedas, 3 escenarios que se
// desbloquean por altura en la partida libre o por racha, y el congelador de
// racha. Precios de los temas ×1,5 sobre los de la v2 (revisión final de la
// v3). `comprar` y `equipar` son puras: devuelven el mismo progreso si no se
// puede.
import { MAX_CONGELADORES } from "./diarios.ts";
import type { Progreso } from "./progreso.ts";
import { formatearNumero } from "./tarjeta.ts";

export type Tema = { tipo: "tema"; id: string; nombre: string; precio: number };
export type EscenarioArticulo = {
  tipo: "escenario";
  id: string;
  nombre: string;
  /** El nombre con artículo, para las frases: «la Ciudad». */
  conArticulo: string;
  /** Metros de altura récord en la partida libre que lo desbloquean (0: gratis). */
  altura: number;
  /** Mejor racha que también lo desbloquea (0: gratis). */
  racha: number;
};
export type Consumible = { tipo: "consumible"; id: string; nombre: string; precio: number; maximo: number };
export type Articulo = Tema | EscenarioArticulo | Consumible;

export const PRECIO_CONGELADOR = 200;

export const TEMAS: readonly Tema[] = [
  { tipo: "tema", id: "riso", nombre: "Riso", precio: 0 },
  { tipo: "tema", id: "madera", nombre: "Madera", precio: 450 },
  { tipo: "tema", id: "caramelo", nombre: "Caramelo", precio: 1470 },
  { tipo: "tema", id: "neon", nombre: "Neón", precio: 2520 },
  { tipo: "tema", id: "marmol", nombre: "Mármol", precio: 3780 },
  { tipo: "tema", id: "oro", nombre: "Oro", precio: 6300 },
];

export const ESCENARIOS: readonly EscenarioArticulo[] = [
  { tipo: "escenario", id: "puerto", nombre: "Puerto", conArticulo: "el Puerto", altura: 0, racha: 0 },
  { tipo: "escenario", id: "ciudad", nombre: "Ciudad", conArticulo: "la Ciudad", altura: 25, racha: 3 },
  { tipo: "escenario", id: "nubes", nombre: "Nubes", conArticulo: "las Nubes", altura: 50, racha: 7 },
];

export const CONGELADOR: Consumible = { tipo: "consumible", id: "congelador", nombre: "Congelador de racha", precio: PRECIO_CONGELADOR, maximo: MAX_CONGELADORES };

export const CATALOGO: readonly Articulo[] = [...TEMAS, ...ESCENARIOS, CONGELADOR];

export const TEMA_INICIAL = "riso";
export const ESCENARIO_INICIAL = "puerto";

export function articulo(id: string): Articulo | undefined {
  return CATALOGO.find((a) => a.id === id);
}

/** ¿Cumple el progreso la condición del escenario? Altura récord en libre o mejor racha. */
export function desbloqueado(p: Progreso, escenario: EscenarioArticulo): boolean {
  return escenario.altura === 0 || p.libre.alturaRecord >= escenario.altura || p.racha.mejor >= escenario.racha;
}

/** ¿Se puede equipar? Temas gratis o comprados; escenarios desbloqueados. */
export function loTiene(p: Progreso, id: string): boolean {
  const a = articulo(id);
  if (!a) return false;
  if (a.tipo === "tema") return a.precio === 0 || p.catalogo.comprados.includes(id);
  if (a.tipo === "escenario") return desbloqueado(p, a);
  return p.racha.congeladores > 0;
}

/**
 * Compra un tema o un congelador. Sin monedas suficientes, si ya se tiene (o
 * hay `maximo` congeladores) o si es un escenario, devuelve el mismo progreso.
 */
export function comprar(p: Progreso, id: string): Progreso {
  const a = articulo(id);
  if (!a || a.tipo === "escenario" || p.monedas < a.precio) return p;
  if (a.tipo === "consumible") {
    if (p.racha.congeladores >= a.maximo) return p;
    return { ...p, monedas: p.monedas - a.precio, racha: { ...p.racha, congeladores: p.racha.congeladores + 1 } };
  }
  if (loTiene(p, id)) return p;
  return { ...p, monedas: p.monedas - a.precio, catalogo: { ...p.catalogo, comprados: [...p.catalogo.comprados, id] } };
}

/** Equipa un tema o escenario que se tenga; si no, devuelve el mismo progreso. */
export function equipar(p: Progreso, id: string): Progreso {
  const a = articulo(id);
  if (!a || a.tipo === "consumible" || !loTiene(p, id)) return p;
  const equipado = a.tipo === "tema" ? { ...p.catalogo.equipado, tema: id } : { ...p.catalogo.equipado, escenario: id };
  return { ...p, catalogo: { ...p.catalogo, equipado } };
}

/** Lo equipado si se tiene; si no (datos viejos o a mano), lo inicial. */
export function equipado(p: Progreso): { tema: string; escenario: string } {
  const { tema, escenario } = p.catalogo.equipado;
  return {
    tema: articulo(tema)?.tipo === "tema" && loTiene(p, tema) ? tema : TEMA_INICIAL,
    escenario: articulo(escenario)?.tipo === "escenario" && loTiene(p, escenario) ? escenario : ESCENARIO_INICIAL,
  };
}

/** Escenarios desbloqueados en `despues` que no lo estaban en `antes` (aviso en el fin). */
export function nuevosEscenarios(antes: Progreso, despues: Progreso): EscenarioArticulo[] {
  return ESCENARIOS.filter((e) => !desbloqueado(antes, e) && desbloqueado(despues, e));
}

/** Siguiente escenario que se desbloquea por racha («Racha de 3: Ciudad»), o `null` si ya están todos. */
export function siguienteDesbloqueoRacha(p: Progreso): EscenarioArticulo | null {
  return ESCENARIOS.find((e) => !desbloqueado(p, e)) ?? null;
}

/**
 * El siguiente objetivo más cercano, para la pantalla de fin (Anexo 1, 2.6):
 * un tema que ya se puede comprar, o el que esté más cerca entre el tema más
 * barato que falta y el siguiente escenario por altura. `null` si no queda nada.
 */
export function siguienteObjetivo(p: Progreso): string | null {
  const tema = TEMAS.find((t) => t.precio > 0 && !loTiene(p, t.id));
  const escenario = ESCENARIOS.find((e) => !desbloqueado(p, e));
  if (tema && p.monedas >= tema.precio) return `Ya puedes comprar el tema ${tema.nombre}`;
  const faltaTema = tema ? (tema.precio - p.monedas) / tema.precio : Infinity;
  const faltaEscenario = escenario ? (escenario.altura - p.libre.alturaRecord) / escenario.altura : Infinity;
  if (tema && faltaTema <= faltaEscenario) return `Te faltan ${formatearNumero(tema.precio - p.monedas)} monedas para ${tema.nombre}`;
  if (escenario) return `Llega a ${escenario.altura} m para ${escenario.conArticulo}`;
  return null;
}
