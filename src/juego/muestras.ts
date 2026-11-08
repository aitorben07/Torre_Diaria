// Muestras de la colección (C3): una torre de cuatro piezas fijas dibujada con
// el mismo `Lienzo` del juego, de cerca, con el tema y el escenario del
// artículo. Se pinta una vez al abrir la colección (no por fotograma).
import type { Pieza } from "../logica/piezas.ts";
import type { CuerpoVisible, EstadoPartida } from "../logica/simulacion.ts";
import { Lienzo } from "./dibujo.ts";
import type { Escenario, Tema } from "./temas.ts";

/** Metros de mundo que caben en una muestra: la plataforma entera y algo de cielo. */
const VISTA = { anchoVista: 5.2, altoVista: 6 };

const pieza = (forma: Pieza["forma"], ancho: number, alto: number, color: number): Pieza => ({ forma, ancho, alto, color, velocidad: 0 });

/** Bloque, tablón, cuadrado y trapecio apilados, con un poco de desorden. */
const TORRE: CuerpoVisible[] = (() => {
  const piezas: Array<[Pieza, number, number]> = [
    [pieza("bloque", 1.25, 0.8, 0), -0.1, 0],
    [pieza("tablon", 2.0, 0.32, 3), 0.05, 0],
    [pieza("cuadrado", 0.9, 0.9, 1), 0.15, 0.02],
    [pieza("triangulo", 1.2, 0.7, 2), 0.05, 0],
  ];
  let y = 0;
  return piezas.map(([p, x, angulo]) => {
    const cuerpo = { pieza: p, x, y: y + p.alto / 2, angulo };
    y += p.alto;
    return cuerpo;
  });
})();

const ESTADO: EstadoPartida = {
  fase: "apuntando",
  pasos: 0,
  puntos: 0,
  // Con altura 0 la cámara no se mueve: la muestra sale igual siempre.
  altura: 0,
  vidas: 3,
  combo: 0,
  objetivo: 0,
  colgada: null,
  cuerpos: TORRE,
};

const lienzos = new WeakMap<HTMLCanvasElement, Lienzo>();

/** Pinta en `canvas` (ya visible, con su tamaño CSS) la torre de muestra con `tema` y `escenario`. */
export function pintarMuestra(canvas: HTMLCanvasElement, tema: Tema, escenario: Escenario): void {
  let lienzo = lienzos.get(canvas);
  if (!lienzo) {
    lienzo = new Lienzo(canvas, null, VISTA);
    lienzos.set(canvas, lienzo);
  }
  lienzo.cambiarTema(tema, escenario);
  lienzo.ajustar();
  lienzo.reiniciarCamara();
  lienzo.dibujar(ESTADO, 0);
}
