// Política de los vídeos con premio (K2, Anexo I): cuándo se ofrece cada uno
// y qué da. Pura y con la hora (`ahora`, en ms) como parámetro, así se prueba
// con un reloj fijado. El premio solo se aplica después de un vídeo «visto»:
// eso lo decide la página. Si la hora guardada es posterior a la actual (el
// reloj del equipo se atrasó), se toma la actual: como mucho se espera
// `HORAS_VIDEO` desde ahora. Seguir con vídeo (1 por partida, solo en la
// libre) lo decide `pagosSeguir` en `objetos.ts`.
import { estaDesbloqueado } from "./objetos.ts";
import { MAX_OBJETO, type Objeto, type Progreso } from "./progreso.ts";
import { fechaUTC, numeroDia } from "./semilla.ts";

/** Monedas por vídeo de monedas. */
export const MONEDAS_VIDEO = 60;
/** Horas entre dos vídeos de monedas. */
export const HORAS_VIDEO = 4;
/** Objetos gratis con vídeo por día UTC. */
export const OBJETOS_VIDEO_DIA = 1;

const MS_VIDEO = HORAS_VIDEO * 3_600_000;

function diaDe(ahora: number): number {
  return numeroDia(fechaUTC(new Date(ahora)));
}

/** Milisegundos que faltan para el siguiente vídeo de monedas (0: ya se puede). */
export function esperaVideoMonedas(p: Progreso, ahora: number): number {
  const ultimo = p.recompensas.ultimoVideoMonedas;
  if (ultimo === 0) return 0;
  return Math.max(0, Math.min(ultimo, ahora) + MS_VIDEO - ahora);
}

export function videoMonedasDisponible(p: Progreso, ahora: number): boolean {
  return esperaVideoMonedas(p, ahora) === 0;
}

/**
 * Con el reloj atrasado, la hora del último vídeo (o su día) quedaría en el
 * futuro y la espera no acabaría nunca: se rebaja a la actual. La página lo
 * aplica al abrir; sin nada en el futuro, devuelve el mismo progreso.
 */
export function corregirReloj(p: Progreso, ahora: number): Progreso {
  const r = p.recompensas;
  const hoy = diaDe(ahora);
  if (r.ultimoVideoMonedas <= ahora && r.diaObjetoVideo <= hoy) return p;
  return { ...p, recompensas: { ...r, ultimoVideoMonedas: Math.min(r.ultimoVideoMonedas, ahora), diaObjetoVideo: Math.min(r.diaObjetoVideo, hoy) } };
}

/** «Disponible en 1 min», «Disponible en 2 h 5 min»: los minutos se redondean hacia arriba. */
export function textoEspera(ms: number): string {
  const minutos = Math.ceil(ms / 60_000);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  const partes = [horas > 0 ? `${horas} h` : "", resto > 0 || horas === 0 ? `${resto} min` : ""].filter(Boolean);
  return `Disponible en ${partes.join(" ")}`;
}

/** Premio de un vídeo de monedas visto. Si aún no tocaba, el mismo progreso. */
export function cobrarVideoMonedas(p: Progreso, ahora: number): Progreso {
  if (!videoMonedasDisponible(p, ahora)) return p;
  return { ...p, monedas: p.monedas + MONEDAS_VIDEO, recompensas: { ...p.recompensas, ultimoVideoMonedas: ahora } };
}

/** Objetos ya conseguidos con vídeo hoy (UTC). Un día guardado en el futuro cuenta como hoy. */
function objetosVideoHoy(p: Progreso, ahora: number): number {
  const hoy = diaDe(ahora);
  return p.recompensas.diaObjetoVideo >= hoy ? p.recompensas.objetosVideo : 0;
}

/** ¿Se ofrece este objeto gratis con vídeo? Desbloqueado, por debajo del máximo y sin haber usado el de hoy. */
export function objetoVideoDisponible(p: Progreso, ahora: number, objeto: Objeto): boolean {
  return estaDesbloqueado(p, objeto) && p.objetos[objeto] < MAX_OBJETO && objetosVideoHoy(p, ahora) < OBJETOS_VIDEO_DIA;
}

/** Premio de un vídeo de objeto visto: una unidad. Si no tocaba, el mismo progreso. */
export function cobrarObjetoVideo(p: Progreso, ahora: number, objeto: Objeto): Progreso {
  if (!objetoVideoDisponible(p, ahora, objeto)) return p;
  return {
    ...p,
    objetos: { ...p.objetos, [objeto]: p.objetos[objeto] + 1 },
    recompensas: { ...p.recompensas, diaObjetoVideo: diaDe(ahora), objetosVideo: objetosVideoHoy(p, ahora) + 1 },
  };
}
