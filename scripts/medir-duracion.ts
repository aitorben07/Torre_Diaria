// Mide en Node la duración y los puntos de las partidas (B4) con los jugadores
// simulados de `duracion.ts` en los días 1 a 30. Objetivos de duración mediana:
// novato de 60 a 150 s, medio de 120 a 300 s y experto de 240 a 720 s, y
// ninguna partida llega al tope de 30 minutos.
// Uso: npm run medir:duracion [-- <días> [<perfil>]]
import { mediana, medirPerfil, PERFILES } from "./duracion.ts";

const DIAS = Number(process.argv[2] ?? 30);
const SOLO = process.argv[3];

const redondear = (valor: number) => Number(valor.toFixed(1));
const resumen = (valores: number[]) => ({
  mediana: redondear(mediana(valores)),
  min: redondear(Math.min(...valores)),
  max: redondear(Math.max(...valores)),
});

for (const perfil of PERFILES.filter((p) => !SOLO || p.nombre === SOLO)) {
  const inicio = performance.now();
  const { medidas } = medirPerfil(perfil, DIAS);
  console.log(
    JSON.stringify({
      perfil: perfil.nombre,
      errorMs: perfil.errorMs,
      dias: DIAS,
      segundos: resumen(medidas.map((m) => m.segundos)),
      piezas: resumen(medidas.map((m) => m.piezas)),
      puntos: resumen(medidas.map((m) => m.puntos)),
      perfectos: resumen(medidas.map((m) => m.perfectos)),
      monedas: resumen(medidas.map((m) => m.monedas)),
      alturaMax: resumen(medidas.map((m) => m.alturaMax)),
      alTope: medidas.filter((m) => !m.terminada).length,
      tiempoS: redondear((performance.now() - inicio) / 1000),
    }),
  );
}
