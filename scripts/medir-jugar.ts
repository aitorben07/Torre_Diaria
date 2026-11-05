// Mide en Node el tiempo de `jugar` para una partida de 40 piezas o más
// (mediana de 5 ejecuciones). Es el dato para decidir si volver a simular una
// partida cabe en los 10 ms de CPU de un Worker (D3). No es un umbral.
// Uso: npm run medir
import { jugar, Partida } from "../src/logica/simulacion.ts";

const SEMILLA = "2026-11-06";
// Alternar dos columnas a ±1,2 m aguanta 43 piezas con esta semilla.
const OBJETIVOS = [-1.2, 1.2];

function toquesAlternos(semilla: string): number[] {
  const partida = new Partida(semilla);
  const toques: number[] = [];
  while (!partida.terminada && partida.pasos < 100_000) {
    const { colgada } = partida.estado();
    const objetivo = OBJETIVOS[toques.length % OBJETIVOS.length]!;
    if (colgada && Math.abs(colgada.x - objetivo) <= colgada.pieza.velocidad / 120 + 1e-9) {
      toques.push(partida.pasos);
      partida.soltar();
    }
    partida.paso();
  }
  return toques;
}

const toques = toquesAlternos(SEMILLA);
jugar(SEMILLA, toques); // calentamiento del compilador
const tiempos: number[] = [];
let resultado = jugar(SEMILLA, toques);
for (let i = 0; i < 5; i++) {
  const inicio = performance.now();
  resultado = jugar(SEMILLA, toques);
  tiempos.push(performance.now() - inicio);
}
tiempos.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    semilla: SEMILLA,
    piezasSoltadas: toques.length,
    puntos: resultado.puntos,
    pasos: resultado.pasos,
    medianaMs: Number(tiempos[2]!.toFixed(1)),
    tiemposMs: tiempos.map((t) => Number(t.toFixed(1))),
    node: process.version,
  }),
);
