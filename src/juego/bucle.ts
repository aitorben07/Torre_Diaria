// Bucle de la pantalla: `requestAnimationFrame` con un acumulador que llama a
// la simulación a paso fijo. Todo se cuenta en pasos, así que si un fotograma
// llega tarde el juego se ralentiza, pero no se desincroniza de `jugar`.

export const PASO_MS = 1000 / 60;
export const MAX_PASOS_POR_FOTOGRAMA = 5;

/**
 * Suma `dtMs` al acumulador y dice cuántos pasos tocan. Si son más de
 * `MAX_PASOS_POR_FOTOGRAMA`, da el máximo y descarta el resto.
 */
export function consumirTiempo(acumulado: number, dtMs: number): { pasos: number; acumulado: number } {
  const total = acumulado + Math.max(0, dtMs);
  const pasos = Math.floor(total / PASO_MS);
  if (pasos > MAX_PASOS_POR_FOTOGRAMA) return { pasos: MAX_PASOS_POR_FOTOGRAMA, acumulado: 0 };
  return { pasos, acumulado: total - pasos * PASO_MS };
}

/** Llama a `avanzar(pasos)` y a `dibujar()` en cada fotograma; se pausa con la pestaña oculta. */
export class Bucle {
  private acumulado = 0;
  private ultimo: number | null = null;
  private pausado = false;

  constructor(
    private readonly avanzar: (pasos: number) => void,
    private readonly dibujar: () => void,
  ) {}

  iniciar(): void {
    document.addEventListener("visibilitychange", () => {
      this.pausado = document.hidden;
      this.acumulado = 0;
      this.ultimo = null;
    });
    requestAnimationFrame(this.fotograma);
  }

  /** Vacía el acumulador, por ejemplo al empezar una partida. */
  reiniciar(): void {
    this.acumulado = 0;
    this.ultimo = null;
  }

  private readonly fotograma = (ahora: number): void => {
    const dt = this.ultimo === null ? 0 : ahora - this.ultimo;
    this.ultimo = ahora;
    if (!this.pausado) {
      const { pasos, acumulado } = consumirTiempo(this.acumulado, dt);
      this.acumulado = acumulado;
      if (pasos > 0) this.avanzar(pasos);
    }
    this.dibujar();
    requestAnimationFrame(this.fotograma);
  };
}
