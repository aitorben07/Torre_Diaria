// Vibración (A4, Anexo 1, 1.6) con `navigator.vibrate` si existe. En iOS no
// existe y se ignora en silencio; con la vibración apagada no se llama nunca.

/** Patrones en milisegundos (vibra, pausa, vibra...). */
export const PATRONES = {
  aterrizar: 8,
  perfecto: 15,
  vidaExtra: [15, 30, 15],
  caida: [30, 40, 30],
  record: 20,
  /** 20 ms por estrella de nivel (Anexo 1, 1.6). */
  estrella: 20,
} as const satisfies Record<string, number | readonly number[]>;

export type Vibracion = keyof typeof PATRONES;

/** ¿Puede vibrar este navegador? */
export function puedeVibrar(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export class Haptica {
  private encendida = true;

  get activa(): boolean {
    return this.encendida;
  }

  cambiar(activa: boolean): void {
    this.encendida = activa;
  }

  vibrar(tipo: Vibracion): void {
    if (!this.encendida || !puedeVibrar()) return;
    const patron = PATRONES[tipo];
    try {
      navigator.vibrate(typeof patron === "number" ? patron : [...patron]);
    } catch {
      // Algunos navegadores lanzan sin gesto previo: no es un error del juego.
    }
  }
}
