// Objetos de ayuda (I2, Anexo H con impacto R-5): catálogo con precio en
// monedas, desbloqueo por partidas terminadas con un regalo de bienvenida, y
// comprar o gastar una unidad. Funciones puras sobre el progreso: la página
// las aplica con `Guardado.cambiar`. Sin premios por ganar niveles (R-5).
import { MAX_OBJETO, OBJETOS, type Objeto, type Progreso } from "./progreso.ts";

export { MAX_OBJETO, OBJETOS, type Objeto };

/** Unidades que se regalan al desbloquear cada objeto. */
export const REGALO_DESBLOQUEO = 2;

export type ObjetoCatalogo = {
  id: Objeto;
  nombre: string;
  /** Qué hace, en una frase. */
  texto: string;
  /** Precio de una unidad en monedas. */
  precio: number;
  /** Partidas terminadas (libre, oficial o nivel) que lo desbloquean. */
  partidas: number;
};

export const CATALOGO_OBJETOS: readonly ObjetoCatalogo[] = [
  { id: "reloj", nombre: "Reloj de arena", texto: "Las 5 piezas siguientes caen más despacio", precio: 120, partidas: 2 },
  { id: "cemento", nombre: "Cemento", texto: "La pieza que cuelga se vuelve de cemento", precio: 180, partidas: 4 },
  { id: "corazon", nombre: "Corazón", texto: "Sigue con 1 vida al perder la última", precio: 250, partidas: 6 },
];

export function objetoPorId(id: Objeto): ObjetoCatalogo {
  return CATALOGO_OBJETOS.find((o) => o.id === id)!;
}

export function estaDesbloqueado(p: Progreso, objeto: Objeto): boolean {
  return p.objetos.desbloqueados.includes(objeto);
}

/**
 * Desbloquea los objetos que ya tocan por partidas terminadas y regala
 * `REGALO_DESBLOQUEO` de cada uno, sin pasar de `MAX_OBJETO`. Un objeto ya en
 * `desbloqueados` no se vuelve a regalar: releer o repetir no da nada más.
 */
export function desbloquear(p: Progreso): Progreso {
  const nuevos = CATALOGO_OBJETOS.filter((o) => p.estadisticas.partidas >= o.partidas && !estaDesbloqueado(p, o.id));
  if (nuevos.length === 0) return p;
  const objetos = { ...p.objetos, desbloqueados: [...p.objetos.desbloqueados] };
  for (const { id } of nuevos) {
    objetos[id] = Math.min(MAX_OBJETO, objetos[id] + REGALO_DESBLOQUEO);
    objetos.desbloqueados.push(id);
  }
  return { ...p, objetos };
}

/** Objetos desbloqueados en `despues` que no lo estaban en `antes` (para el aviso del fin). */
export function objetosNuevos(antes: Progreso, despues: Progreso): ObjetoCatalogo[] {
  return CATALOGO_OBJETOS.filter((o) => estaDesbloqueado(despues, o.id) && !estaDesbloqueado(antes, o.id));
}

/** ¿Se puede comprar una unidad? Desbloqueado, con monedas para su precio y por debajo del máximo. */
export function sePuedeComprar(p: Progreso, objeto: Objeto): boolean {
  return estaDesbloqueado(p, objeto) && p.monedas >= objetoPorId(objeto).precio && p.objetos[objeto] < MAX_OBJETO;
}

/** Compra una unidad con monedas. Si no se puede, devuelve el mismo progreso. */
export function comprarObjeto(p: Progreso, objeto: Objeto): Progreso {
  if (!sePuedeComprar(p, objeto)) return p;
  return { ...p, monedas: p.monedas - objetoPorId(objeto).precio, objetos: { ...p.objetos, [objeto]: p.objetos[objeto] + 1 } };
}

/** Gasta una unidad. Con 0, devuelve el mismo progreso. */
export function gastarObjeto(p: Progreso, objeto: Objeto): Progreso {
  if (p.objetos[objeto] <= 0) return p;
  return { ...p, objetos: { ...p.objetos, [objeto]: p.objetos[objeto] - 1 } };
}

/** «¿Seguir?» en la libre solo con al menos esta parte del récord (con récord 0, siempre). */
export const PARTE_RECORD_SEGUIR = 0.3;

/** Con qué se paga seguir: un corazón guardado, sus monedas o un vídeo (si hay proveedor). */
export type PagoSeguir = "corazon" | "monedas" | "video";

/**
 * Formas de pagar «¿Seguir?» al perder la última vida (I3 con impacto R-4):
 * solo en la partida libre y con el corazón desbloqueado o un vídeo
 * disponible; en la libre, solo si los puntos llegan a `PARTE_RECORD_SEGUIR`
 * del récord. Vacía: no se ofrece y se va directo al fin. Que sea una vez por
 * partida lo decide la simulación (`Partida.seguir`).
 */
export function pagosSeguir(p: Progreso, { modo, puntos, video }: { modo: string; puntos: number; video: boolean }): PagoSeguir[] {
  if (modo !== "libre") return [];
  const record = p.libre.record;
  if (record > 0 && puntos < PARTE_RECORD_SEGUIR * record) return [];
  const pagos: PagoSeguir[] = [];
  if (estaDesbloqueado(p, "corazon")) {
    if (p.objetos.corazon > 0) pagos.push("corazon");
    if (p.monedas >= objetoPorId("corazon").precio) pagos.push("monedas");
  }
  if (video) pagos.push("video");
  return pagos;
}

/** Cobra seguir: un corazón o su precio en monedas (el vídeo no cuesta nada). Si no alcanza, el mismo progreso. */
export function pagarSeguir(p: Progreso, pago: PagoSeguir): Progreso {
  if (pago === "corazon") return gastarObjeto(p, "corazon");
  if (pago === "monedas") {
    const precio = objetoPorId("corazon").precio;
    return estaDesbloqueado(p, "corazon") && p.monedas >= precio ? { ...p, monedas: p.monedas - precio } : p;
  }
  return p;
}
