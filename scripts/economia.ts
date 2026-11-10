// Ritmo de la economía (C5): simula 45 días de cada perfil con su plan de
// juego (Anexo 1, 4.4, sin misiones ni niveles por el recorte I1) y dice cuándo
// compra el primer tema, cuántos tiene el día 7 y qué día completa el catálogo
// comprable. Usa partidas reales de `jugar` con los perfiles de B4: una muestra
// de 10 por perfil que se reutiliza en orden. Las monedas, premios, medallas y
// precios son los del juego (`economia.ts`, `diarios.ts`, `catalogo.ts`).
// Desde la v3 (L3) las partidas cuentan las monedas de las doradas y hay dos
// planes más: comprar objetos de ayuda cada día y ver vídeos de monedas.
import { TEMAS } from "../src/logica/catalogo.ts";
import { medallaDePuntos } from "../src/logica/diarios.ts";
import { hitosDeAltura, monedasDePartida, premioDiario } from "../src/logica/economia.ts";
import { CATALOGO_OBJETOS, MAX_OBJETO, REGALO_DESBLOQUEO } from "../src/logica/objetos.ts";
import { MONEDAS_VIDEO } from "../src/logica/recompensas.ts";
import { jugarConPerfil, mediana, type Medida, type Perfil } from "./duracion.ts";

/** Minutos de juego al día de cada perfil (Anexo 1, 4.4). */
export const MINUTOS_AL_DIA: Record<string, number> = { novato: 10, medio: 15, experto: 25 };
export const DIAS = 45;
export const MUESTRA = 10;

/** Lo que importa de una partida para la economía. `monedas`, las de la partida con las doradas; sin el campo, se calculan sin ellas. */
export type PartidaMuestra = Pick<Medida, "segundos" | "puntos" | "piezas" | "perfectos" | "alturaMax"> & { monedas?: number };

/**
 * Plan de gasto (L3). `objetosAlDia`: objetos que compra cada día, el más
 * barato de los desbloqueados que no esté al máximo (no los usa: los
 * jugadores simulados no usan ayudas). `videosAlDia`: vídeos de monedas que
 * ve cada día (el de objeto no da monedas). Sin plan, solo temas, como la v2.
 */
export type Plan = { objetosAlDia?: number; videosAlDia?: number };

export type Ritmo = {
  /** Minutos de juego hasta la primera compra (`null` si no llega). */
  primeraCompraMin: number | null;
  /** Temas comprados al acabar el día 7. */
  articulosDia7: number;
  /** Día en que se compra el último tema (`null` si no llega en `dias`). */
  catalogoCompletoDia: number | null;
  /** Monedas ganadas de media al día. */
  monedasAlDia: number;
  /** Objetos comprados con monedas en todos los días (plan con objetos). */
  objetosComprados: number;
};

function monedas(p: PartidaMuestra): number {
  return p.monedas ?? monedasDePartida({ piezas: p.piezas, perfectos: p.perfectos, hitos: hitosDeAltura(p.alturaMax) });
}

/** Mediana de monedas por partida de la muestra (L3: para comparar con el precio del reloj). */
export function monedasMedianas(muestra: readonly PartidaMuestra[]): number {
  return mediana(muestra.map(monedas));
}

/**
 * Cada día: primero el reto diario oficial (partida, premio por medalla y por
 * racha, que sube cada día hasta 7), los vídeos del plan y después partidas
 * libres hasta gastar los minutos. En cuanto le llegan las monedas compra
 * primero los objetos del día del plan y después el tema más barato que falte.
 * Los objetos se desbloquean por partidas terminadas, con su regalo, como en
 * el juego (`objetos.ts`).
 */
export function simular(muestra: readonly PartidaMuestra[], minutosAlDia: number, dias: number = DIAS, plan: Plan = {}): Ritmo {
  const precios = TEMAS.filter((t) => t.precio > 0).map((t) => t.precio);
  let saldo = 0;
  let comprados = 0;
  let minutos = 0;
  let ganadas = 0;
  let siguiente = 0;
  let partidas = 0;
  let objetosHoy = 0;
  const inventario = new Map<string, number>();
  const ritmo: Ritmo = { primeraCompraMin: null, articulosDia7: 0, catalogoCompletoDia: null, monedasAlDia: 0, objetosComprados: 0 };
  const terminar = () => {
    partidas++;
    for (const o of CATALOGO_OBJETOS) if (!inventario.has(o.id) && partidas >= o.partidas) inventario.set(o.id, REGALO_DESBLOQUEO);
  };
  const cobrar = (cantidad: number, dia: number) => {
    saldo += cantidad;
    ganadas += cantidad;
    for (;;) {
      if (objetosHoy >= (plan.objetosAlDia ?? 0)) break;
      const barato = CATALOGO_OBJETOS.filter((o) => (inventario.get(o.id) ?? MAX_OBJETO) < MAX_OBJETO).sort((a, b) => a.precio - b.precio)[0];
      if (!barato || saldo < barato.precio) break;
      saldo -= barato.precio;
      inventario.set(barato.id, inventario.get(barato.id)! + 1);
      objetosHoy++;
      ritmo.objetosComprados++;
    }
    while (comprados < precios.length && saldo >= precios[comprados]!) {
      saldo -= precios[comprados]!;
      comprados++;
      if (comprados === 1) ritmo.primeraCompraMin = Math.round(minutos * 10) / 10;
      if (comprados === precios.length) ritmo.catalogoCompletoDia = dia;
    }
  };
  for (let dia = 1; dia <= dias; dia++) {
    let restante = minutosAlDia * 60;
    objetosHoy = 0;
    const reto = muestra[siguiente++ % muestra.length]!;
    minutos += reto.segundos / 60;
    restante -= reto.segundos;
    terminar();
    cobrar(monedas(reto) + premioDiario(medallaDePuntos(reto.puntos), dia), dia);
    // Los vídeos del día, de 4 h en 4 h: aquí se cobran juntos tras el reto.
    if (plan.videosAlDia) cobrar(plan.videosAlDia * MONEDAS_VIDEO, dia);
    while (restante > 0) {
      const libre = muestra[siguiente++ % muestra.length]!;
      // La última partida del día se cobra entera aunque pase un poco de los minutos.
      minutos += libre.segundos / 60;
      restante -= libre.segundos;
      terminar();
      cobrar(monedas(libre), dia);
    }
    if (dia === 7) ritmo.articulosDia7 = comprados;
  }
  ritmo.monedasAlDia = Math.round(ganadas / dias);
  return ritmo;
}

/** Muestra de partidas libres del perfil, siempre la misma. */
export function muestraDe(perfil: Perfil, n: number = MUESTRA): PartidaMuestra[] {
  return Array.from({ length: n }, (_, i) => {
    const { segundos, puntos, piezas, perfectos, alturaMax, monedas } = jugarConPerfil(`economia-${i + 1}`, perfil);
    return { segundos, puntos, piezas, perfectos, alturaMax, monedas };
  });
}
