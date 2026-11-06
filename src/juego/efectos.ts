// Azar visual (A2, A3): parpadeos, decorado y partículas. Tiene su propia
// semilla, distinta de la de la partida, y no toca la simulación: cambiarlo no
// cambia puntos ni pasos.

/** Generador mulberry32 de números en [0, 1). Solo para el dibujo. */
export function crearAzarVisual(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número en [min, max) con el azar visual. */
export function entreVisual(azar: () => number, min: number, max: number): number {
  return min + azar() * (max - min);
}
