// Mide en Node la duración de las partidas (D6) con los jugadores simulados de
// `duracion.ts` en 10 días distintos. Objetivo: mediana del descuidado de 30 s
// o más y del cuidadoso de 90 s o menos. Uso: npm run medir:duracion
import { medirPerfil, PERFILES } from "./duracion.ts";

const DIAS = 10;

for (const perfil of PERFILES) {
  const { medianaS, medidas } = medirPerfil(perfil, DIAS);
  const segundos = medidas.map((m) => m.segundos);
  console.log(
    JSON.stringify({
      perfil: perfil.nombre,
      errorMs: perfil.errorMs,
      dias: DIAS,
      medianaS: Number(medianaS.toFixed(1)),
      minS: Number(Math.min(...segundos).toFixed(1)),
      maxS: Number(Math.max(...segundos).toFixed(1)),
      segundos: segundos.map((s) => Number(s.toFixed(1))),
      piezas: medidas.map((m) => m.piezas),
    }),
  );
}
