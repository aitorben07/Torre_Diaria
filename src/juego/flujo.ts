// Flujo de pantallas (B5): máquina de estados pura, sin DOM ni reloj. La página
// (`principal.ts`) le pasa la acción, la hora y lo que sabe del día, y ejecuta
// la orden que recibe. Así las transiciones se prueban con Vitest.
import type { Reto } from "../logica/reto.ts";

/** En la pantalla de fin se ignoran toques y teclas durante este tiempo (impacto, 2.5). */
export const ESPERA_FIN_MS = 700;

export type Modo = "libre" | "oficial" | "reto";
export type Pantalla = "reto" | "jugando" | "fin";

export type Flujo = {
  pantalla: Pantalla;
  modo: Modo;
  dia: number;
  /** Momento (en ms, del reloj que use la página) en que se mostró el fin. */
  finDesde: number;
};

/** Lo que la página tiene que hacer tras la acción. */
export type Orden =
  | { tipo: "jugar"; modo: Modo; dia: number }
  | { tipo: "resultado"; dia: number }
  | { tipo: "reto" }
  | { tipo: "nada" };

export type Accion =
  /** La partida en marcha ha terminado. */
  | { tipo: "terminar" }
  /** «Otra vez» o «Partida libre». */
  | { tipo: "libre" }
  /** «Reto de hoy»: se juega o, si ya se jugó, se ve el resultado. */
  | { tipo: "retoDeHoy" }
  /** «Jugar el reto del día #N» desde el aviso del enlace del amigo. */
  | { tipo: "jugarReto"; reto: Reto };

export type Contexto = { ahora: number; hoy: number; jugadoHoy: boolean };

const NADA: Orden = { tipo: "nada" };

/** Al abrir la página: con un reto válido, su aviso; sin él, la partida libre ya en marcha. */
export function abrir(reto: Reto | null, hoy: number): { flujo: Flujo; orden: Orden } {
  if (reto) return { flujo: { pantalla: "reto", modo: "reto", dia: reto.dia, finDesde: -Infinity }, orden: { tipo: "reto" } };
  return { flujo: empezar("libre", hoy), orden: { tipo: "jugar", modo: "libre", dia: hoy } };
}

/** Estado de una partida recién empezada. */
export function empezar(modo: Modo, dia: number): Flujo {
  return { pantalla: "jugando", modo, dia, finDesde: -Infinity };
}

/** Estado al mostrar un resultado ya guardado: sin espera, porque no viene de una partida. */
export function verResultado(dia: number): Flujo {
  return { pantalla: "fin", modo: "oficial", dia, finDesde: -Infinity };
}

/** ¿Acepta la pantalla toques y botones? En el fin, solo pasados `ESPERA_FIN_MS`. */
export function aceptaEntrada(flujo: Flujo, ahora: number): boolean {
  return flujo.pantalla !== "fin" || ahora - flujo.finDesde >= ESPERA_FIN_MS;
}

/** Siguiente estado y orden tras una acción. Las acciones ignoradas devuelven el mismo estado y `nada`. */
export function transicion(flujo: Flujo, accion: Accion, { ahora, hoy, jugadoHoy }: Contexto): { flujo: Flujo; orden: Orden } {
  if (accion.tipo === "terminar") {
    if (flujo.pantalla !== "jugando") return { flujo, orden: NADA };
    return { flujo: { ...flujo, pantalla: "fin", finDesde: ahora }, orden: NADA };
  }
  if (!aceptaEntrada(flujo, ahora)) return { flujo, orden: NADA };
  const jugarHoy = (): { flujo: Flujo; orden: Orden } =>
    jugadoHoy
      ? { flujo: verResultado(hoy), orden: { tipo: "resultado", dia: hoy } }
      : { flujo: empezar("oficial", hoy), orden: { tipo: "jugar", modo: "oficial", dia: hoy } };
  switch (accion.tipo) {
    case "libre":
      return { flujo: empezar("libre", hoy), orden: { tipo: "jugar", modo: "libre", dia: hoy } };
    case "retoDeHoy":
      return jugarHoy();
    case "jugarReto":
      // El reto de hoy sin jugar es el intento oficial; el de otro día no se guarda (como en la v1).
      if (accion.reto.dia === hoy) return jugarHoy();
      return { flujo: empezar("reto", accion.reto.dia), orden: { tipo: "jugar", modo: "reto", dia: accion.reto.dia } };
  }
}
