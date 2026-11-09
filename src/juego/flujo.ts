// Flujo de pantallas (B5): máquina de estados pura, sin DOM ni reloj. La página
// (`principal.ts`) le pasa la acción, la hora y lo que sabe de los días, y
// ejecuta la orden que recibe. Así las transiciones se prueban con Vitest.
// Retos, Niveles y Colección (C3, D2, E3) se abren encima de la pantalla que
// hubiera; si era una partida, queda en pausa y al cerrar sigue.
import type { Reto } from "../logica/reto.ts";

/** En la pantalla de fin se ignoran toques y teclas durante este tiempo (impacto, 2.5). */
export const ESPERA_FIN_MS = 700;

/**
 * `oficial`: el primer intento de un día, que se guarda (de hoy o atrasado);
 * `repeticion`: las piezas de un día ya jugado, que no cuenta (D1);
 * `nivel`: un nivel del mapa (E3).
 */
export type Modo = "libre" | "oficial" | "repeticion" | "nivel";
export type Pantalla = "reto" | "jugando" | "fin" | "retos" | "niveles" | "coleccion";
/** Pantallas que se abren encima de otra. */
export type Panel = "retos" | "niveles" | "coleccion";

export type Flujo = {
  pantalla: Pantalla;
  modo: Modo;
  dia: number;
  /** Número del nivel en el modo `nivel`; 0 en los demás. */
  nivel: number;
  /** Momento (en ms, del reloj que use la página) en que se mostró el fin. */
  finDesde: number;
  /** Con un panel abierto, la pantalla a la que se vuelve al cerrarlo. */
  debajo: Exclude<Pantalla, Panel> | null;
};

/** Lo que la página tiene que hacer tras la acción. */
export type Orden =
  /** `nivel` solo en el modo `nivel`. */
  | { tipo: "jugar"; modo: Modo; dia: number; nivel?: number }
  | { tipo: "resultado"; dia: number }
  | { tipo: "reto" }
  | { tipo: "panel"; panel: Panel }
  /** Se cierra el panel y se vuelve a `pantalla` (si es una partida, sigue). */
  | { tipo: "volver"; pantalla: Exclude<Pantalla, Panel> }
  | { tipo: "nada" };

export type Accion =
  /** La partida en marcha ha terminado. */
  | { tipo: "terminar" }
  /** «Otra vez» o «Partida libre». */
  | { tipo: "libre" }
  /** «Jugar» en la ficha de un día: el oficial si no se ha jugado, o su resultado si ya se jugó. */
  | { tipo: "jugarDia"; dia: number }
  /** «Jugar otra vez (no cuenta)»: las piezas de un día ya jugado. */
  | { tipo: "repetirDia"; dia: number }
  /** «Jugar el reto» desde el aviso del enlace del amigo. */
  | { tipo: "jugarReto"; reto: Reto }
  /** «Jugar» en la ficha de un nivel, o «Repetir» en su fin (E3). */
  | { tipo: "jugarNivel"; nivel: number }
  /** «Siguiente nivel» en el fin de un nivel ganado. */
  | { tipo: "siguienteNivel" }
  | { tipo: "abrir"; panel: Panel }
  | { tipo: "cerrar" };

export type Contexto = {
  ahora: number;
  hoy: number;
  jugado: (dia: number) => boolean;
  /** ¿Se puede jugar ya el nivel? (E1: el 1, o el siguiente a uno completado.) Sin ella, ninguno. */
  nivelDisponible?: (nivel: number) => boolean;
};

const NADA: Orden = { tipo: "nada" };

/** Al abrir la página: con un reto válido, su aviso; sin él, la partida libre ya en marcha. */
export function abrir(reto: Reto | null, hoy: number): { flujo: Flujo; orden: Orden } {
  if (reto) return { flujo: { pantalla: "reto", modo: "oficial", dia: reto.dia, nivel: 0, finDesde: -Infinity, debajo: null }, orden: { tipo: "reto" } };
  return { flujo: empezar("libre", hoy), orden: { tipo: "jugar", modo: "libre", dia: hoy } };
}

/** Estado de una partida recién empezada. */
export function empezar(modo: Modo, dia: number, nivel: number = 0): Flujo {
  return { pantalla: "jugando", modo, dia, nivel: modo === "nivel" ? nivel : 0, finDesde: -Infinity, debajo: null };
}

/** Estado al mostrar un resultado ya guardado: sin espera, porque no viene de una partida. */
export function verResultado(dia: number): Flujo {
  return { pantalla: "fin", modo: "oficial", dia, nivel: 0, finDesde: -Infinity, debajo: null };
}

/** El reto diario y su repetición no se pueden dejar a medias: se podrían mirar las piezas y empezar otra vez. */
function sinPausa(modo: Modo): boolean {
  return modo === "oficial" || modo === "repeticion";
}

/** ¿Acepta la pantalla toques y botones? En el fin, solo pasados `ESPERA_FIN_MS`. */
export function aceptaEntrada(flujo: Flujo, ahora: number): boolean {
  return flujo.pantalla !== "fin" || ahora - flujo.finDesde >= ESPERA_FIN_MS;
}

/** ¿Hay una partida en pausa debajo de un panel? */
export function enPausa(flujo: Flujo): boolean {
  return flujo.debajo === "jugando";
}

/** Siguiente estado y orden tras una acción. Las acciones ignoradas devuelven el mismo estado y `nada`. */
export function transicion(flujo: Flujo, accion: Accion, { ahora, hoy, jugado, nivelDisponible = () => false }: Contexto): { flujo: Flujo; orden: Orden } {
  if (accion.tipo === "terminar") {
    if (flujo.pantalla !== "jugando") return { flujo, orden: NADA };
    return { flujo: { ...flujo, pantalla: "fin", finDesde: ahora }, orden: NADA };
  }
  if (!aceptaEntrada(flujo, ahora)) return { flujo, orden: NADA };
  const jugarDia = (dia: number): { flujo: Flujo; orden: Orden } => {
    if (dia < 1 || dia > hoy) return { flujo, orden: NADA };
    return jugado(dia)
      ? { flujo: verResultado(dia), orden: { tipo: "resultado", dia } }
      : { flujo: empezar("oficial", dia), orden: { tipo: "jugar", modo: "oficial", dia } };
  };
  const jugarNivel = (nivel: number): { flujo: Flujo; orden: Orden } => {
    if (!nivelDisponible(nivel)) return { flujo, orden: NADA };
    return { flujo: empezar("nivel", hoy, nivel), orden: { tipo: "jugar", modo: "nivel", dia: hoy, nivel } };
  };
  switch (accion.tipo) {
    case "libre":
      return { flujo: empezar("libre", hoy), orden: { tipo: "jugar", modo: "libre", dia: hoy } };
    case "jugarDia":
      return jugarDia(accion.dia);
    case "jugarReto":
      // Sin jugar, el día del amigo es el intento oficial (de hoy o atrasado); jugado, su resultado.
      return jugarDia(accion.reto.dia);
    case "jugarNivel":
      return jugarNivel(accion.nivel);
    case "siguienteNivel":
      if (flujo.pantalla !== "fin" || flujo.modo !== "nivel") return { flujo, orden: NADA };
      return jugarNivel(flujo.nivel + 1);
    case "repetirDia":
      if (!jugado(accion.dia) || accion.dia > hoy) return { flujo, orden: NADA };
      return { flujo: empezar("repeticion", accion.dia), orden: { tipo: "jugar", modo: "repeticion", dia: accion.dia } };
    case "abrir": {
      if (flujo.pantalla === accion.panel) return { flujo, orden: NADA };
      // El reto diario en marcha no se deja a medias; la partida libre y los niveles quedan en pausa.
      if (flujo.pantalla === "jugando" && sinPausa(flujo.modo)) return { flujo, orden: NADA };
      const debajo = flujo.debajo ?? (flujo.pantalla as Exclude<Pantalla, Panel>);
      return { flujo: { ...flujo, pantalla: accion.panel, debajo }, orden: { tipo: "panel", panel: accion.panel } };
    }
    case "cerrar":
      if (!flujo.debajo) return { flujo, orden: NADA };
      return { flujo: { ...flujo, pantalla: flujo.debajo, debajo: null }, orden: { tipo: "volver", pantalla: flujo.debajo } };
  }
}
