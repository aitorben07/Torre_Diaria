// Escena de la pantalla de inicio (E2, Anexo B): el escenario equipado con una
// pieza que se mece en el gancho a la velocidad inicial. Es solo dibujo: no
// hay física ni partida, así que no cuenta pasos ni cambia nada guardado.
import { generarSecuencia, type Pieza } from "../logica/piezas.ts";
import { VEL_INICIAL } from "../logica/ritmo.ts";
import { posicionVaiven, type EstadoPartida } from "../logica/simulacion.ts";

/** Semilla de la pieza del inicio: siempre la misma, un cuadrado con ojos. */
export const SEMILLA_INICIO = "inicio";
/**
 * Altura del centro de la pieza, como fracción de los metros que se ven sobre
 * la plataforma: en el hueco entre el logo y «Jugar».
 */
export const ALTURA_PIEZA = 0.5;

const pieza: Pieza = generarSecuencia(SEMILLA_INICIO, 1)[0]!;

/**
 * Estado que dibuja el lienzo en el inicio: sin torre y con la pieza colgando a
 * `segundos` de vaivén (a `VEL_INICIAL`, como la primera pieza de la partida).
 */
export function estadoDeInicio(segundos: number, metrosVisibles: number): EstadoPartida {
  const x = posicionVaiven(Math.max(0, segundos) * VEL_INICIAL, false);
  const y = Math.max(pieza.alto, metrosVisibles * ALTURA_PIEZA);
  return {
    fase: "apuntando",
    pasos: 0,
    puntos: 0,
    altura: 0,
    vidas: 0,
    combo: 0,
    objetivo: 0,
    colgada: { pieza, x, y, angulo: 0, velocidad: VEL_INICIAL },
    cuerpos: [],
  };
}
