// Jugadores simulados para medir cuánto dura una partida (D6). Cada perfil
// intenta soltar la pieza cuando pasa por el centro de la torre (x = 0), la
// primera vez que pasa, con un error de tiempo aleatorio fijado por semilla:
// a más velocidad, el mismo error de tiempo aleja más la pieza del centro.
// Es orientativo: un jugador real también espera, duda o apunta a otro sitio.
import { crearGenerador, fechaDeDia } from "../src/logica/semilla.ts";
import { AMPLITUD, PASO, Partida } from "../src/logica/simulacion.ts";

export type Perfil = {
  nombre: string;
  /** El toque llega con un error uniforme entre -errorMs y +errorMs. */
  errorMs: number;
};

export const PERFILES: Perfil[] = [
  { nombre: "cuidadoso", errorMs: 60 },
  { nombre: "descuidado", errorMs: 150 },
];

/** Tope de seguridad: 10 minutos de partida. */
export const MAX_PASOS = 36_000;

export type Medida = { semilla: string; segundos: number; piezas: number; puntos: number; terminada: boolean };

/** Juega una partida con el perfil dado. El azar del error depende solo de la semilla y del perfil. */
export function jugarConPerfil(semilla: string, perfil: Perfil): Medida {
  const azar = crearGenerador(`${semilla}|${perfil.nombre}`);
  const partida = new Partida(semilla);
  let piezas = 0;
  let pasoToque: number | null = null;
  while (!partida.terminada && partida.pasos < MAX_PASOS) {
    const { colgada } = partida.estado();
    if (!colgada) {
      pasoToque = null;
    } else if (pasoToque === null) {
      // Pasos hasta el centro desde el extremo en que aparece, más el error.
      const alCentro = Math.round(AMPLITUD / (colgada.pieza.velocidad * PASO));
      const error = Math.round(((azar() * 2 - 1) * perfil.errorMs) / (PASO * 1000));
      pasoToque = partida.pasos + Math.max(1, alCentro + error);
    }
    if (colgada && partida.pasos === pasoToque && partida.soltar()) piezas++;
    partida.paso();
  }
  const { puntos, pasos, terminada } = partida.resultado();
  return { semilla, segundos: pasos / 60, piezas, puntos, terminada };
}

export function mediana(valores: number[]): number {
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 1 ? orden[medio]! : (orden[medio - 1]! + orden[medio]!) / 2;
}

/** Mide el perfil en `dias` días seguidos desde `desde` (número de día del reto). */
export function medirPerfil(perfil: Perfil, dias: number, desde: number = 1): { perfil: string; medianaS: number; medidas: Medida[] } {
  const medidas = Array.from({ length: dias }, (_, i) => jugarConPerfil(fechaDeDia(desde + i), perfil));
  return { perfil: perfil.nombre, medianaS: mediana(medidas.map((m) => m.segundos)), medidas };
}
