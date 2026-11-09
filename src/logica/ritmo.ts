// Ritmo de la partida (B1 de la tercera versión, Anexo J con los cambios de
// impacto): la velocidad del vaivén ya no es un dato fijo de cada pieza de la
// secuencia. La `Partida` lleva un «ritmo» que sube al soltar y baja al caer o
// al seguir, y calcula la velocidad de cada pieza al colgarla. Puro y
// determinista: sin reloj ni azar.

/** Velocidad de la primera pieza, en m/s, si la partida no pide otra (los niveles sí). */
export const VEL_INICIAL = 1.3;
/** Lo que sube la velocidad por cada punto de ritmo (cada pieza soltada). */
export const VEL_INCREMENTO = 0.025;
export const VEL_TOPE = 3.4;
/** Puntos de ritmo que se quitan tras una caída: la siguiente va más despacio. */
export const RESPIRO_CAIDA = 4;
/** Puntos de ritmo que se quitan al seguir tras perder la última vida (I1). */
export const RESPIRO_SEGUIR = 8;
/** Con este combo o más, la partida va «en racha» y la velocidad se multiplica por `RACHA_MULT`. */
export const RACHA_COMBO = 5;
export const RACHA_MULT = 1.08;
/** El reloj de arena (I1) multiplica la velocidad por esto. */
export const RELOJ_MULT = 0.6;

/** Lo que mueve el ritmo. */
export type EventoRitmo = "soltada" | "caida" | "seguir";

/** Ritmo tras `evento`. Nunca baja de 0, así que la velocidad base nunca baja de la inicial. */
export function siguienteRitmo(ritmo: number, evento: EventoRitmo): number {
  switch (evento) {
    case "soltada":
      return ritmo + 1;
    case "caida":
      return Math.max(0, ritmo - RESPIRO_CAIDA);
    case "seguir":
      return Math.max(0, ritmo - RESPIRO_SEGUIR);
  }
}

export type OpcionesVelocidad = {
  /** Velocidad de la primera pieza de la partida (por defecto `VEL_INICIAL`). */
  inicial?: number;
  /** Combo al colgar la pieza: con `RACHA_COMBO` o más, va en racha. */
  combo?: number;
  /** Con el reloj de arena activo. */
  reloj?: boolean;
};

function centesimas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Velocidad de la pieza que se cuelga con este ritmo:
 * `min(VEL_TOPE, centésimas((inicial + VEL_INCREMENTO · ritmo) · racha)) · reloj`.
 * Sin velocidad mínima (impacto, B1): con el ritmo ≥ 0, la base no baja de la
 * inicial, y el reloj multiplica después sin redondear, para que frene
 * exactamente `RELOJ_MULT`.
 */
export function velocidadDe(ritmo: number, { inicial = VEL_INICIAL, combo = 0, reloj = false }: OpcionesVelocidad = {}): number {
  const racha = combo >= RACHA_COMBO ? RACHA_MULT : 1;
  const base = Math.min(VEL_TOPE, centesimas((inicial + VEL_INCREMENTO * Math.max(0, ritmo)) * racha));
  return reloj ? base * RELOJ_MULT : base;
}
