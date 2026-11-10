// Mide en Node la duración y los puntos de las partidas (B4) con los jugadores
// simulados de `duracion.ts` en los días 1 a 30. Objetivos de duración mediana:
// novato de 60 a 150 s, medio de 120 a 300 s y experto de 240 a 720 s, y
// ninguna partida llega al tope de 30 minutos. También el porcentaje de días
// con cada medalla del reto diario (D1): el novato bronce o más, el medio plata
// o más y el experto oro, cada uno en la mitad de los días o más. Y el
// arranque (B2 de la tercera versión): segundo de la primera suelta, cadencia
// inicial (mediana de segundos entre las sueltas 1 a 10) y segundo en que se
// coloca la décima pieza, con la mediana de los días. Y las piezas especiales
// que llegan a colgar, de media por partida (L1).
// Uso: npm run medir:duracion [-- <días> [<perfil>]]
import { UMBRAL_BRONCE, UMBRAL_ORO, UMBRAL_PLATA } from "../src/logica/diarios.ts";
import { mediana, medirPerfil, PERFILES } from "./duracion.ts";

const DIAS = Number(process.argv[2] ?? 30);
const SOLO = process.argv[3];

const redondear = (valor: number) => Number(valor.toFixed(1));
const resumen = (valores: number[]) => ({
  mediana: redondear(mediana(valores)),
  min: redondear(Math.min(...valores)),
  max: redondear(Math.max(...valores)),
});

/** Como `resumen`, sin las partidas que no llegan a medirlo, con dos decimales. */
const resumenDe = (valores: Array<number | null>) => {
  const medidos = valores.filter((v): v is number => v !== null);
  if (medidos.length === 0) return null;
  const dos = (v: number) => Number(v.toFixed(2));
  return { mediana: dos(mediana(medidos)), min: dos(Math.min(...medidos)), max: dos(Math.max(...medidos)) };
};

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
      primeraS: resumenDe(medidas.map((m) => m.primeraS)),
      cadenciaS: resumenDe(medidas.map((m) => m.cadenciaS)),
      decimaS: resumenDe(medidas.map((m) => m.decimaS)),
      sinDecima: medidas.filter((m) => m.decimaS === null).length,
      especialesMedia: Number((medidas.reduce((suma, m) => suma + m.especiales, 0) / medidas.length).toFixed(1)),
      alTope: medidas.filter((m) => !m.terminada).length,
      medallas: Object.fromEntries(
        (
          [
            ["bronceOMas", UMBRAL_BRONCE],
            ["plataOMas", UMBRAL_PLATA],
            ["oro", UMBRAL_ORO],
          ] as const
        ).map(([nombre, umbral]) => [nombre, `${Math.round((100 * medidas.filter((m) => m.puntos >= umbral).length) / medidas.length)} %`]),
      ),
      tiempoS: redondear((performance.now() - inicio) / 1000),
    }),
  );
}
