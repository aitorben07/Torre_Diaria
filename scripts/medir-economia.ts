// Mide el ritmo de la economía (C5) con los perfiles de B4. Objetivos: el
// novato compra su primer tema en 12 min de juego o menos; el medio tiene de 3
// a 6 temas el día 7 y el catálogo comprable completo entre los días 10 y 30;
// el experto no lo completa antes del día 7. Con la v3 (L3), dos planes más:
// «objetos» (el medio compra 1 objeto al día y el experto 2; el novato,
// ninguno) y «videos» (4 vídeos de monedas al día y 1 objeto con vídeo, que no
// da monedas). Objetivos: con objetos, el medio completa los temas entre los
// días 10 y 30; con vídeos, no antes del día 10; y la mediana de monedas por
// partida del medio da para un reloj.
// Uso: npm run medir:economia
import { objetoPorId } from "../src/logica/objetos.ts";
import { PERFILES } from "./duracion.ts";
import { DIAS, MINUTOS_AL_DIA, monedasMedianas, muestraDe, simular, type Plan } from "./economia.ts";

const OBJETOS_AL_DIA: Record<string, number> = { novato: 0, medio: 1, experto: 2 };

for (const perfil of PERFILES) {
  const inicio = performance.now();
  const muestra = muestraDe(perfil);
  const planes: Array<[string, Plan]> = [
    ["temas", {}],
    ["objetos", { objetosAlDia: OBJETOS_AL_DIA[perfil.nombre]! }],
    ["videos", { videosAlDia: 4 }],
  ];
  for (const [plan, opciones] of planes) {
    const ritmo = simular(muestra, MINUTOS_AL_DIA[perfil.nombre]!, DIAS, opciones);
    console.log(JSON.stringify({ perfil: perfil.nombre, plan, minutosAlDia: MINUTOS_AL_DIA[perfil.nombre], dias: DIAS, ...ritmo }));
  }
  const porPartida = monedasMedianas(muestra);
  console.log(
    JSON.stringify({
      perfil: perfil.nombre,
      monedasMedianasPorPartida: porPartida,
      precioReloj: objetoPorId("reloj").precio,
      relojConUnaPartida: porPartida >= objetoPorId("reloj").precio,
      tiempoS: Number(((performance.now() - inicio) / 1000).toFixed(1)),
    }),
  );
}
