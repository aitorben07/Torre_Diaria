// Huecos para anuncios (G1, `docs/diseno/anuncios.md`): solo la interfaz, una
// implementación que no hace nada (`anunciosNulos`) y los puntos de llamada,
// sin SDK, sin red y sin botones (impacto, G1: nada de botones de anuncio que
// no hacen nada). Las llamadas salen de las transiciones del flujo con una
// función pura, así que se prueban con Vitest. El juego entero funciona igual
// sin anuncios: con `anunciosNulos`, «Otra vez» empieza en el mismo instante.
import type { Accion, Flujo, Orden } from "./flujo.ts";

export type TipoAnuncio = "intersticial" | "recompensado";
/** Transiciones con intersticial (anuncios.md, apartado 2, puntos 4 y 5). */
export type MotivoIntersticial = "otra-vez" | "siguiente-nivel";
/** Recompensados futuros (puntos 1 a 3): ninguno se llama en esta fase. */
export type MotivoRecompensado = "seguir" | "doble-monedas" | "congelador";
export type ResultadoRecompensado = "visto" | "cancelado" | "error";

export interface Anuncios {
  /** ¿Hay un anuncio de este tipo listo? Si no, el juego sigue sin esperar. */
  disponible(tipo: TipoAnuncio): boolean;
  intersticial(motivo: MotivoIntersticial): Promise<void>;
  recompensado(motivo: MotivoRecompensado): Promise<ResultadoRecompensado>;
  /** Empieza o sigue una partida (el SDK del portal lo pide: `gameplayStart`). */
  partidaEmpieza(): void;
  /** Acaba o se pausa una partida (`gameplayStop`). */
  partidaPara(): void;
}

/** Sin anuncios: nada disponible y todo resuelve al momento sin hacer nada. */
export const anunciosNulos: Anuncios = {
  disponible: () => false,
  intersticial: () => Promise.resolve(),
  recompensado: () => Promise.resolve("cancelado"),
  partidaEmpieza: () => {},
  partidaPara: () => {},
};

/**
 * Anuncios de la compilación según `PUBLIC_PLATAFORMA`. Solo existe `web` (o
 * nada), que no lleva anuncios; un portal tendría aquí su adaptador, en una
 * compilación aparte (anuncios.md, apartado 5).
 */
export function anunciosDePlataforma(_plataforma: string | undefined): Anuncios {
  return anunciosNulos;
}

export type Llamada = { tipo: "partidaEmpieza" } | { tipo: "partidaPara" } | { tipo: "intersticial"; motivo: MotivoIntersticial };

/** Llamadas de una transición: las de `antes` van antes de ejecutar la orden; las de `despues`, después. */
export type Llamadas = { antes: Llamada[]; despues: Llamada[] };

/** Al abrir la página: si la partida libre ya empieza, avisa. */
export function llamadasAlAbrir(orden: Orden): Llamadas {
  return { antes: [], despues: orden.tipo === "jugar" ? [{ tipo: "partidaEmpieza" }] : [] };
}

/**
 * Llamadas de una transición del flujo (anuncios.md, apartados 2 y 7): al
 * acabar o pausar una partida (un panel encima), `partidaPara`; al empezar o
 * seguir una, `partidaEmpieza`; y antes de empezar, el intersticial de «Otra
 * vez» (desde el fin de una libre) o de «Siguiente nivel». El reto diario no
 * tiene ninguno, y en esta fase no hay recompensados.
 */
export function llamadasDeTransicion(antes: Flujo, despues: Flujo, accion: Accion, orden: Orden): Llamadas {
  const llamadas: Llamadas = { antes: [], despues: [] };
  if (antes.pantalla === "jugando" && despues.pantalla !== "jugando") llamadas.antes.push({ tipo: "partidaPara" });
  const empieza = orden.tipo === "jugar" || (orden.tipo === "volver" && orden.pantalla === "jugando");
  if (orden.tipo === "jugar" && antes.pantalla === "fin") {
    if (accion.tipo === "libre" && antes.modo === "libre") llamadas.antes.push({ tipo: "intersticial", motivo: "otra-vez" });
    if (accion.tipo === "siguienteNivel") llamadas.antes.push({ tipo: "intersticial", motivo: "siguiente-nivel" });
  }
  if (empieza) llamadas.despues.push({ tipo: "partidaEmpieza" });
  return llamadas;
}

function llamar(anuncios: Anuncios, llamada: Llamada): Promise<void> | null {
  if (llamada.tipo === "partidaEmpieza") anuncios.partidaEmpieza();
  else if (llamada.tipo === "partidaPara") anuncios.partidaPara();
  else {
    // Se pide siempre (el SDK decide); solo se espera si hay uno listo.
    const espera = anuncios.intersticial(llamada.motivo);
    if (anuncios.disponible("intersticial")) return espera.catch(() => undefined);
  }
  return null;
}

/**
 * Hace las llamadas de `antes`, luego `seguir` (la orden del flujo) y luego las
 * de `despues`. Si un intersticial está disponible, espera a que acabe; si no
 * (como con `anunciosNulos`), todo pasa en el mismo instante.
 */
export function aplicarLlamadas(anuncios: Anuncios, { antes, despues }: Llamadas, seguir: () => void): void {
  let espera: Promise<void> | null = null;
  for (const llamada of antes) espera = llamar(anuncios, llamada) ?? espera;
  const resto = () => {
    seguir();
    for (const llamada of despues) llamar(anuncios, llamada);
  };
  if (espera) void espera.then(resto);
  else resto();
}
