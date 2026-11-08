// Mide el ritmo de la economía (C5) con los perfiles de B4. Objetivos: el
// novato compra su primer tema en 12 min de juego o menos; el medio tiene de 3
// a 6 temas el día 7 y el catálogo comprable completo entre los días 10 y 30;
// el experto no lo completa antes del día 7.
// Uso: npm run medir:economia
import { PERFILES } from "./duracion.ts";
import { DIAS, MINUTOS_AL_DIA, muestraDe, simular } from "./economia.ts";

for (const perfil of PERFILES) {
  const inicio = performance.now();
  const muestra = muestraDe(perfil);
  const ritmo = simular(muestra, MINUTOS_AL_DIA[perfil.nombre]!);
  console.log(
    JSON.stringify({
      perfil: perfil.nombre,
      minutosAlDia: MINUTOS_AL_DIA[perfil.nombre],
      dias: DIAS,
      ...ritmo,
      tiempoS: Number(((performance.now() - inicio) / 1000).toFixed(1)),
    }),
  );
}
