// Mide en Node el coste de la simulación (mediana de 5 ejecuciones):
// 1. El tiempo de `jugar` para una partida de unas 40 piezas, el dato para
//    decidir si volver a simular una partida cabe en los 10 ms de CPU de un
//    Worker (D3). No es un umbral.
// 2. El tiempo medio por paso con 10 y con 150 piezas soltadas, con un jugador
//    que suelta siempre sobre el objetivo: con el cementado (B3) debe quedar en
//    como mucho el doble.
// Uso: npm run medir
import { jugar, Partida } from "../src/logica/simulacion.ts";

const SEMILLA = "2026-11-06";
const SEMILLA_LARGA = "2026-11-09";
const PIEZAS_LARGA = 150;
/** Pasos que se miden alrededor de cada punto (10 y 150 piezas soltadas). */
const VENTANA = 300;

/** Suelta cada pieza cuando pasa sobre el objetivo (perfecto con imán). */
function sobreObjetivo(partida: Partida): boolean {
  const { colgada, objetivo } = partida.estado();
  return colgada !== null && Math.abs(colgada.x - objetivo) <= colgada.velocidad / 120 + 1e-9;
}

function toquesSobreObjetivo(semilla: string, piezas: number): number[] {
  const partida = new Partida(semilla);
  const toques: number[] = [];
  while (!partida.terminada && toques.length < piezas && partida.pasos < 200_000) {
    if (sobreObjetivo(partida)) {
      toques.push(partida.pasos);
      partida.soltar();
    }
    partida.paso();
    partida.tomarEventos();
  }
  return toques;
}

/** Milisegundos por paso en los `VENTANA` pasos que siguen a la suelta número `n` (desde 1). */
function msPorPaso(semilla: string, toques: number[], n: number): number {
  const partida = new Partida(semilla);
  const pendientes = new Set(toques);
  const desde = toques[n - 1]!;
  let inicio = 0;
  while (partida.pasos < desde + VENTANA) {
    if (partida.pasos === desde) inicio = performance.now();
    if (pendientes.has(partida.pasos)) partida.soltar();
    partida.paso();
    partida.tomarEventos();
  }
  return (performance.now() - inicio) / VENTANA;
}

const medianaDe = (valores: number[]) => [...valores].sort((a, b) => a - b)[Math.floor(valores.length / 2)]!;

const toques = toquesSobreObjetivo(SEMILLA, 40);
jugar(SEMILLA, toques); // calentamiento del compilador
const tiempos: number[] = [];
let resultado = jugar(SEMILLA, toques);
for (let i = 0; i < 5; i++) {
  const inicio = performance.now();
  resultado = jugar(SEMILLA, toques);
  tiempos.push(performance.now() - inicio);
}

const larga = toquesSobreObjetivo(SEMILLA_LARGA, PIEZAS_LARGA);
const con10 = Array.from({ length: 5 }, () => msPorPaso(SEMILLA_LARGA, larga, 10));
const con150 = Array.from({ length: 5 }, () => msPorPaso(SEMILLA_LARGA, larga, larga.length));
console.log(
  JSON.stringify({
    semilla: SEMILLA,
    piezasSoltadas: toques.length,
    puntos: resultado.puntos,
    pasos: resultado.pasos,
    medianaMs: Number(medianaDe(tiempos).toFixed(1)),
    tiemposMs: tiempos.map((t) => Number(t.toFixed(1))),
    porPaso: {
      semilla: SEMILLA_LARGA,
      soltadas: larga.length,
      msCon10: Number(medianaDe(con10).toFixed(3)),
      msCon150: Number(medianaDe(con150).toFixed(3)),
      cociente: Number((medianaDe(con150) / medianaDe(con10)).toFixed(2)),
    },
    node: process.version,
  }),
);
