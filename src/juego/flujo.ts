// Flujo de pantallas (B5): máquina de estados pura, sin DOM ni reloj. La página
// (`principal.ts`) le pasa la acción, la hora y lo que sabe de los días, y
// ejecuta la orden que recibe. Así las transiciones se prueban con Vitest.
// Retos, Niveles, Colección y Ajustes (C3, D2, E3 y, en la v3, C2) se abren
// encima de la pantalla que hubiera; si era una partida, queda en pausa y al
// cerrar sigue. Desde la v3 se abre en la pantalla de inicio y la partida se
// puede pausar en todos los modos (E1).
import type { Libre, Reto } from "../logica/reto.ts";

/** En la pantalla de fin se ignoran toques y teclas durante este tiempo (impacto, 2.5). */
export const ESPERA_FIN_MS = 700;

/**
 * `oficial`: el primer intento de un día, que se guarda (de hoy o atrasado);
 * `repeticion`: las piezas de un día ya jugado, que no cuenta (D1);
 * `nivel`: un nivel del mapa (E3).
 */
export type Modo = "libre" | "oficial" | "repeticion" | "nivel";
/** `seguir`: «¿Seguir?» al perder la última vida en la libre, con la partida quieta (I3). */
export type Pantalla = "inicio" | "reto" | "jugando" | "pausa" | "seguir" | "fin" | "retos" | "niveles" | "coleccion" | "ajustes";
/** Pantallas que se abren encima de otra. */
export type Panel = "retos" | "niveles" | "coleccion" | "ajustes";

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
  /** `nivel` solo en el modo `nivel`; `codigo`, en la partida libre del enlace de un amigo (F2). */
  | { tipo: "jugar"; modo: Modo; dia: number; nivel?: number; codigo?: string }
  | { tipo: "resultado"; dia: number }
  | { tipo: "reto" }
  /** Pantalla de inicio (E2): se deja la partida que hubiera. */
  | { tipo: "inicio" }
  /** La partida queda en pausa con su panel (E3). */
  | { tipo: "pausa" }
  /** «¿Seguir?» con la partida quieta (I3). */
  | { tipo: "seguir" }
  | { tipo: "panel"; panel: Panel }
  /** Se cierra el panel y se vuelve a `pantalla` (si es una partida, sigue). */
  | { tipo: "volver"; pantalla: Exclude<Pantalla, Panel> }
  | { tipo: "nada" };

export type Accion =
  /** La partida en marcha ha terminado (también tras «No, ver resultado» en «¿Seguir?»). */
  | { tipo: "terminar" }
  /** Se ha perdido la última vida y hay con qué seguir: «¿Seguir?» (I3). */
  | { tipo: "ofrecerSeguir" }
  /** Se ha pagado seguir: la partida continúa con 1 vida (I3). */
  | { tipo: "seguirTrasPerder" }
  /** «Otra vez» o «Partida libre»; con `codigo`, la partida libre del enlace de un amigo (F2). */
  | { tipo: "libre"; codigo?: string }
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
  | { tipo: "cerrar" }
  /** «Inicio» en el fin, en la pausa (salvo en el reto diario) o en un panel (E1). */
  | { tipo: "inicio" }
  /** Botón de pausa, Escape o P durante la partida, o la pestaña que se oculta (E3). */
  | { tipo: "pausar" }
  /** «Seguir» en la pausa. */
  | { tipo: "seguirPartida" };

export type Contexto = {
  ahora: number;
  hoy: number;
  jugado: (dia: number) => boolean;
  /** ¿Se puede jugar ya el nivel? (E1: el 1, o el siguiente a uno completado.) Sin ella, ninguno. */
  nivelDisponible?: (nivel: number) => boolean;
};

const NADA: Orden = { tipo: "nada" };

/**
 * Al abrir la página: con un reto válido o el enlace de una partida libre
 * (F2), su aviso; sin ellos, la pantalla de inicio (E1; en la v2 era la
 * partida libre ya en marcha). El reto manda.
 */
export function abrir(reto: Reto | null, hoy: number, libre: Libre | null = null): { flujo: Flujo; orden: Orden } {
  if (!reto && libre) return { flujo: { pantalla: "reto", modo: "libre", dia: hoy, nivel: 0, finDesde: -Infinity, debajo: null }, orden: { tipo: "reto" } };
  if (reto) return { flujo: { pantalla: "reto", modo: "oficial", dia: reto.dia, nivel: 0, finDesde: -Infinity, debajo: null }, orden: { tipo: "reto" } };
  return { flujo: enInicio(hoy), orden: NADA };
}

/** Estado de la pantalla de inicio. */
export function enInicio(hoy: number): Flujo {
  return { pantalla: "inicio", modo: "libre", dia: hoy, nivel: 0, finDesde: -Infinity, debajo: null };
}

/** Estado de una partida recién empezada. */
export function empezar(modo: Modo, dia: number, nivel: number = 0): Flujo {
  return { pantalla: "jugando", modo, dia, nivel: modo === "nivel" ? nivel : 0, finDesde: -Infinity, debajo: null };
}

/** Estado al mostrar un resultado ya guardado: sin espera, porque no viene de una partida. */
export function verResultado(dia: number): Flujo {
  return { pantalla: "fin", modo: "oficial", dia, nivel: 0, finDesde: -Infinity, debajo: null };
}

/**
 * El reto diario y su repetición no se pueden dejar a medias: se podrían mirar
 * las piezas y empezar otra vez. Se pausan, pero desde la pausa solo se abren
 * los Ajustes y no hay «Inicio» ni «Abandonar» (impacto §5, R-3).
 */
export function sinSalida(modo: Modo): boolean {
  return modo === "oficial" || modo === "repeticion";
}

/** ¿Acepta la pantalla toques y botones? En el fin, solo pasados `ESPERA_FIN_MS`. */
export function aceptaEntrada(flujo: Flujo, ahora: number): boolean {
  return flujo.pantalla !== "fin" || ahora - flujo.finDesde >= ESPERA_FIN_MS;
}

/** Siguiente estado y orden tras una acción. Las acciones ignoradas devuelven el mismo estado y `nada`. */
export function transicion(flujo: Flujo, accion: Accion, { ahora, hoy, jugado, nivelDisponible = () => false }: Contexto): { flujo: Flujo; orden: Orden } {
  if (accion.tipo === "terminar") {
    if (flujo.pantalla !== "jugando" && flujo.pantalla !== "seguir") return { flujo, orden: NADA };
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
    case "ofrecerSeguir":
      if (flujo.pantalla !== "jugando" || flujo.modo !== "libre") return { flujo, orden: NADA };
      return { flujo: { ...flujo, pantalla: "seguir" }, orden: { tipo: "seguir" } };
    case "seguirTrasPerder":
      if (flujo.pantalla !== "seguir") return { flujo, orden: NADA };
      return { flujo: { ...flujo, pantalla: "jugando" }, orden: { tipo: "volver", pantalla: "jugando" } };
    case "libre":
      if (accion.codigo) return { flujo: empezar("libre", hoy), orden: { tipo: "jugar", modo: "libre", dia: hoy, codigo: accion.codigo } };
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
      // Desde «¿Seguir?» no se abre nada: se sigue o se ve el resultado (I3).
      if (flujo.pantalla === accion.panel || flujo.pantalla === "seguir") return { flujo, orden: NADA };
      // El reto diario en marcha no se deja a medias: con él en marcha o en pausa, solo los Ajustes.
      if (enReto(flujo) && (flujo.pantalla === "jugando" || accion.panel !== "ajustes")) return { flujo, orden: NADA };
      const debajo = flujo.debajo ?? (flujo.pantalla as Exclude<Pantalla, Panel>);
      return { flujo: { ...flujo, pantalla: accion.panel, debajo }, orden: { tipo: "panel", panel: accion.panel } };
    }
    case "cerrar":
      if (!flujo.debajo) return { flujo, orden: NADA };
      return { flujo: { ...flujo, pantalla: flujo.debajo, debajo: null }, orden: { tipo: "volver", pantalla: flujo.debajo } };
    case "pausar":
      if (flujo.pantalla !== "jugando") return { flujo, orden: NADA };
      return { flujo: { ...flujo, pantalla: "pausa" }, orden: { tipo: "pausa" } };
    case "seguirPartida":
      if (flujo.pantalla !== "pausa") return { flujo, orden: NADA };
      return { flujo: { ...flujo, pantalla: "jugando" }, orden: { tipo: "volver", pantalla: "jugando" } };
    case "inicio": {
      const base = flujo.debajo ?? flujo.pantalla;
      if (base !== "fin" && base !== "pausa" && base !== "inicio") return { flujo, orden: NADA };
      if (flujo.pantalla === "inicio" || enReto(flujo)) return { flujo, orden: NADA };
      return { flujo: enInicio(hoy), orden: { tipo: "inicio" } };
    }
  }
}

/** ¿Hay un reto diario (o su repetición) en marcha o en pausa, quizá con un panel encima? */
function enReto(flujo: Flujo): boolean {
  const base = flujo.debajo ?? flujo.pantalla;
  return (base === "jugando" || base === "pausa") && sinSalida(flujo.modo);
}
