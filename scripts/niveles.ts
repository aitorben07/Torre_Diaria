// Validación de los niveles (E2) con los jugadores simulados de `duracion.ts`:
// cada perfil juega cada nivel `INTENTOS` veces, con errores distintos en cada
// intento. De ahí salen los umbrales de estrellas (S26): `p2`, la mediana de
// puntos del medio cuando gana, y `p3`, la del experto, redondeadas a 50 hacia
// abajo para que la mitad de las victorias del experto lleguen. A estas
// velocidades el medio y el experto simulados aciertan casi siempre y empatan:
// entonces `p2` queda 50 por debajo de `p3`.
import { estrellasDe, NIVELES, opcionesDeNivel, type Nivel } from "../src/logica/niveles.ts";
import { jugarConPerfil, mediana, PERFILES, type Medida, type Perfil } from "./duracion.ts";

export const INTENTOS = 10;

export type MedidaNivel = {
  nivel: number;
  perfil: string;
  ganadas: number;
  tresEstrellas: number;
  /** Mediana de los puntos y de la duración de las partidas ganadas (`null` si no gana ninguna). */
  puntosGanadas: number | null;
  segundosGanadas: number | null;
  medidas: Medida[];
};

export function medirNivel(nivel: Nivel, perfil: Perfil, intentos: number = INTENTOS): MedidaNivel {
  const medidas = Array.from({ length: intentos }, (_, i) => jugarConPerfil(nivel.semilla, perfil, opcionesDeNivel(nivel), i + 1));
  const ganadas = medidas.filter((m) => m.victoria);
  return {
    nivel: nivel.numero,
    perfil: perfil.nombre,
    ganadas: ganadas.length,
    tresEstrellas: medidas.filter((m) => estrellasDe(nivel, m) === 3).length,
    puntosGanadas: ganadas.length > 0 ? mediana(ganadas.map((m) => m.puntos)) : null,
    segundosGanadas: ganadas.length > 0 ? mediana(ganadas.map((m) => m.segundos)) : null,
    medidas,
  };
}

export const redondear50 = (puntos: number): number => Math.floor(puntos / 50) * 50;

/** Umbrales propuestos para un nivel; `null` si el medio o el experto no ganan nunca o no hay hueco para dos umbrales. */
export function umbrales(medio: MedidaNivel, experto: MedidaNivel): { p2: number; p3: number } | null {
  if (medio.puntosGanadas === null || experto.puntosGanadas === null) return null;
  const p3 = redondear50(experto.puntosGanadas);
  const p2 = Math.min(redondear50(medio.puntosGanadas), p3 - 50);
  return p2 > 0 ? { p2, p3 } : null;
}

/**
 * Requisitos de E2 con el recorte de impacto: el novato gana los niveles 1 a 5
 * en 6 de 10 o más; el medio gana cada nivel en 6 de 10 o más, salvo el jefe
 * (4 de 10); el experto saca 3 estrellas en 3 de 10 o más en cada nivel; y la
 * mediana de duración de las partidas ganadas por el medio va de 30 a 120 s.
 */
export function fallos(medidas: MedidaNivel[]): string[] {
  const de = (perfil: string) => medidas.filter((m) => m.perfil === perfil);
  const errores: string[] = [];
  for (const m of de("novato")) if (m.nivel <= 5 && m.ganadas < 6) errores.push(`novato gana el nivel ${m.nivel} ${m.ganadas}/10`);
  for (const m of de("medio")) {
    const minimo = NIVELES[m.nivel - 1]!.jefe ? 4 : 6;
    if (m.ganadas < minimo) errores.push(`medio gana el nivel ${m.nivel} ${m.ganadas}/10 (< ${minimo})`);
  }
  for (const m of de("experto")) if (m.tresEstrellas < 3) errores.push(`experto con 3 estrellas en el nivel ${m.nivel} ${m.tresEstrellas}/10`);
  const segundos = de("medio").flatMap((m) => m.medidas.filter((x) => x.victoria).map((x) => x.segundos));
  const duracion = segundos.length > 0 ? mediana(segundos) : 0;
  if (duracion < 30 || duracion > 120) errores.push(`duración mediana del medio al ganar ${duracion.toFixed(1)} s (fuera de 30 a 120)`);
  return errores;
}

export function medirTodo(intentos: number = INTENTOS): MedidaNivel[] {
  return NIVELES.flatMap((nivel) => PERFILES.map((perfil) => medirNivel(nivel, perfil, intentos)));
}
