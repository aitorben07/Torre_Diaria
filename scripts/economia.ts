// Ritmo de la economía (C5): simula 45 días de cada perfil con su plan de
// juego (Anexo 1, 4.4, sin misiones ni niveles por el recorte I1) y dice cuándo
// compra el primer tema, cuántos tiene el día 7 y qué día completa el catálogo
// comprable. Usa partidas reales de `jugar` con los perfiles de B4: una muestra
// de 10 por perfil que se reutiliza en orden. Las monedas, premios, medallas y
// precios son los del juego (`economia.ts`, `diarios.ts`, `catalogo.ts`).
import { TEMAS } from "../src/logica/catalogo.ts";
import { medallaDePuntos } from "../src/logica/diarios.ts";
import { hitosDeAltura, monedasDePartida, premioDiario } from "../src/logica/economia.ts";
import { jugarConPerfil, type Medida, type Perfil } from "./duracion.ts";

/** Minutos de juego al día de cada perfil (Anexo 1, 4.4). */
export const MINUTOS_AL_DIA: Record<string, number> = { novato: 10, medio: 15, experto: 25 };
export const DIAS = 45;
export const MUESTRA = 10;

/** Lo que importa de una partida para la economía. */
export type PartidaMuestra = Pick<Medida, "segundos" | "puntos" | "piezas" | "perfectos" | "alturaMax">;

export type Ritmo = {
  /** Minutos de juego hasta la primera compra (`null` si no llega). */
  primeraCompraMin: number | null;
  /** Temas comprados al acabar el día 7. */
  articulosDia7: number;
  /** Día en que se compra el último tema (`null` si no llega en `dias`). */
  catalogoCompletoDia: number | null;
  /** Monedas ganadas de media al día. */
  monedasAlDia: number;
};

function monedas(p: PartidaMuestra): number {
  return monedasDePartida({ piezas: p.piezas, perfectos: p.perfectos, hitos: hitosDeAltura(p.alturaMax) });
}

/**
 * Cada día: primero el reto diario oficial (partida, premio por medalla y por
 * racha, que sube cada día hasta 7) y después partidas libres hasta gastar los
 * minutos. Compra el tema más barato que falte en cuanto le llegan las monedas.
 */
export function simular(muestra: readonly PartidaMuestra[], minutosAlDia: number, dias: number = DIAS): Ritmo {
  const precios = TEMAS.filter((t) => t.precio > 0).map((t) => t.precio);
  let saldo = 0;
  let comprados = 0;
  let minutos = 0;
  let ganadas = 0;
  let siguiente = 0;
  const ritmo: Ritmo = { primeraCompraMin: null, articulosDia7: 0, catalogoCompletoDia: null, monedasAlDia: 0 };
  const cobrar = (cantidad: number, dia: number) => {
    saldo += cantidad;
    ganadas += cantidad;
    while (comprados < precios.length && saldo >= precios[comprados]!) {
      saldo -= precios[comprados]!;
      comprados++;
      if (comprados === 1) ritmo.primeraCompraMin = Math.round(minutos * 10) / 10;
      if (comprados === precios.length) ritmo.catalogoCompletoDia = dia;
    }
  };
  for (let dia = 1; dia <= dias; dia++) {
    let restante = minutosAlDia * 60;
    const reto = muestra[siguiente++ % muestra.length]!;
    minutos += reto.segundos / 60;
    restante -= reto.segundos;
    cobrar(monedas(reto) + premioDiario(medallaDePuntos(reto.puntos), dia), dia);
    while (restante > 0) {
      const libre = muestra[siguiente++ % muestra.length]!;
      // La última partida del día se cobra entera aunque pase un poco de los minutos.
      minutos += libre.segundos / 60;
      restante -= libre.segundos;
      cobrar(monedas(libre), dia);
    }
    if (dia === 7) ritmo.articulosDia7 = comprados;
  }
  ritmo.monedasAlDia = Math.round(ganadas / dias);
  return ritmo;
}

/** Muestra de partidas libres del perfil, siempre la misma. */
export function muestraDe(perfil: Perfil, n: number = MUESTRA): PartidaMuestra[] {
  return Array.from({ length: n }, (_, i) => jugarConPerfil(`economia-${i + 1}`, perfil));
}
