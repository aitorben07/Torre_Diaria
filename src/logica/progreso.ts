// Progreso guardado v2 (C1): todo lo que el juego recuerda en el navegador va
// en una sola clave, `torre-diaria:progreso`, con su versión. Al leer se valida
// campo a campo, como en `registro.ts`: lo que no se entiende se ignora y, si
// nada se entiende, se empieza de cero sin borrar la clave hasta el primer
// guardado. Si el almacenamiento falla, el juego sigue con lo que tiene en
// memoria (G10). Cada guardado relee la clave y aplica el cambio sobre lo leído,
// así dos pestañas no se pisan las monedas (impacto, 2.4).
import { leerRegistroLibre, leerResultadoV1, type Almacen } from "./registro.ts";

export const CLAVE_PROGRESO = "torre-diaria:progreso";
export const VERSION_PROGRESO = 2;

/** Un día del reto ya jugado: su intento oficial (D1). */
export type DiaJugado = {
  puntos: number;
  piezas: number;
  altura: number;
  perfectos: number;
  /** Índices de las piezas colocadas, como tramos: `"0-11,13-40"` (impacto, C1). */
  colocadas: string;
  /** Jugado el mismo día UTC: cuenta para la racha. */
  enSuDia: boolean;
  /** 1: jugado con la v1 (sin puntos de la v2, sin medalla); 2: reglas actuales (`REGLAS`). */
  reglas: number;
};

export type Progreso = {
  version: number;
  monedas: number;
  catalogo: { comprados: string[]; equipado: { tema: string; escenario: string } };
  libre: { record: number; alturaRecord: number; partidas: number };
  /** Por número de día. */
  diarios: Record<number, DiaJugado>;
  racha: { actual: number; mejor: number; ultimoDia: number; congeladores: number };
  /** Estrellas por nivel (bloque E). */
  niveles: Record<number, number>;
  ajustes: { sonido: boolean; vibracion: boolean; tutorialVisto: boolean };
  estadisticas: { piezas: number; perfectos: number; comboMax: number; alturaMax: number };
  /** Semilla de la última partida cobrada: la misma partida no se cobra dos veces (C2). */
  ultimaCobrada: string;
};

export function progresoVacio(): Progreso {
  return {
    version: VERSION_PROGRESO,
    monedas: 0,
    catalogo: { comprados: [], equipado: { tema: "riso", escenario: "puerto" } },
    libre: { record: 0, alturaRecord: 0, partidas: 0 },
    diarios: {},
    racha: { actual: 0, mejor: 0, ultimoDia: 0, congeladores: 0 },
    niveles: {},
    ajustes: { sonido: true, vibracion: true, tutorialVisto: false },
    estadisticas: { piezas: 0, perfectos: 0, comboMax: 0, alturaMax: 0 },
    ultimaCobrada: "",
  };
}

// --- Tramos de índices ---------------------------------------------------

const TRAMOS = /^(?:\d{1,4}(?:-\d{1,4})?(?:,\d{1,4}(?:-\d{1,4})?)*)?$/;
/** Más no cabe en una partida real (600 piezas como mucho): es un límite contra datos raros. */
const LARGO_MAXIMO_TRAMOS = 4000;

/** Índices crecientes a tramos: `[0, 1, 2, 5, 7, 8]` da `"0-2,5,7-8"`. */
export function aTramos(indices: readonly number[]): string {
  const partes: string[] = [];
  let i = 0;
  while (i < indices.length) {
    const desde = indices[i]!;
    let hasta = desde;
    while (i + 1 < indices.length && indices[i + 1] === hasta + 1) hasta = indices[++i]!;
    partes.push(desde === hasta ? String(desde) : `${desde}-${hasta}`);
    i++;
  }
  return partes.join(",");
}

/** Inversa de `aTramos`. Con un texto mal formado o desordenado, `null`. */
export function deTramos(texto: string): number[] | null {
  if (texto.length > LARGO_MAXIMO_TRAMOS || !TRAMOS.test(texto)) return null;
  if (texto === "") return [];
  const indices: number[] = [];
  for (const parte of texto.split(",")) {
    const [desde, hasta = desde] = parte.split("-").map(Number) as [number, number?];
    if (hasta < desde || (indices.length > 0 && desde <= indices[indices.length - 1]!)) return null;
    for (let n = desde; n <= hasta; n++) indices.push(n);
  }
  return indices;
}

// --- Validación ------------------------------------------------------------

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function entero(valor: unknown, porDefecto: number): number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= Number.MAX_SAFE_INTEGER ? valor : porDefecto;
}

function real(valor: unknown, porDefecto: number): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0 ? valor : porDefecto;
}

function booleano(valor: unknown, porDefecto: boolean): boolean {
  return typeof valor === "boolean" ? valor : porDefecto;
}

/** Ids del catálogo: letras minúsculas, cifras y guiones, cortos. */
function esId(valor: unknown): valor is string {
  return typeof valor === "string" && /^[a-z0-9-]{1,24}$/.test(valor);
}

function leerDia(valor: unknown): DiaJugado | null {
  if (!esObjeto(valor)) return null;
  const colocadas = typeof valor.colocadas === "string" && deTramos(valor.colocadas) !== null ? valor.colocadas : null;
  const reglas = entero(valor.reglas, -1);
  if (colocadas === null || reglas < 1 || typeof valor.enSuDia !== "boolean") return null;
  const puntos = entero(valor.puntos, -1);
  const piezas = entero(valor.piezas, -1);
  if (puntos < 0 || piezas < 0) return null;
  return {
    puntos,
    piezas,
    altura: real(valor.altura, 0),
    perfectos: entero(valor.perfectos, 0),
    colocadas,
    enSuDia: valor.enSuDia,
    reglas,
  };
}

/** Lo legible de un valor ya analizado como JSON; `null` si no es un progreso. */
export function normalizar(valor: unknown): Progreso | null {
  if (!esObjeto(valor) || entero(valor.version, 0) < 2) return null;
  const p = progresoVacio();
  p.monedas = entero(valor.monedas, 0);
  if (esObjeto(valor.catalogo)) {
    const { comprados, equipado } = valor.catalogo;
    if (Array.isArray(comprados)) p.catalogo.comprados = [...new Set(comprados.filter(esId))];
    if (esObjeto(equipado)) {
      if (esId(equipado.tema)) p.catalogo.equipado.tema = equipado.tema;
      if (esId(equipado.escenario)) p.catalogo.equipado.escenario = equipado.escenario;
    }
  }
  if (esObjeto(valor.libre)) {
    p.libre = {
      record: entero(valor.libre.record, 0),
      alturaRecord: real(valor.libre.alturaRecord, 0),
      partidas: entero(valor.libre.partidas, 0),
    };
  }
  if (esObjeto(valor.diarios)) {
    for (const [clave, dia] of Object.entries(valor.diarios)) {
      const numero = Number(clave);
      const leido = leerDia(dia);
      if (/^[1-9]\d{0,5}$/.test(clave) && leido) p.diarios[numero] = leido;
    }
  }
  if (esObjeto(valor.racha)) {
    const r = valor.racha;
    p.racha = {
      actual: entero(r.actual, 0),
      mejor: entero(r.mejor, 0),
      ultimoDia: entero(r.ultimoDia, 0),
      congeladores: Math.min(2, entero(r.congeladores, 0)),
    };
  }
  if (esObjeto(valor.niveles)) {
    for (const [clave, estrellas] of Object.entries(valor.niveles)) {
      const n = entero(estrellas, -1);
      if (/^[1-9]\d{0,2}$/.test(clave) && n >= 0 && n <= 3) p.niveles[Number(clave)] = n;
    }
  }
  if (esObjeto(valor.ajustes)) {
    const a = valor.ajustes;
    p.ajustes = {
      sonido: booleano(a.sonido, true),
      vibracion: booleano(a.vibracion, true),
      tutorialVisto: booleano(a.tutorialVisto, false),
    };
  }
  if (esObjeto(valor.estadisticas)) {
    const e = valor.estadisticas;
    p.estadisticas = {
      piezas: entero(e.piezas, 0),
      perfectos: entero(e.perfectos, 0),
      comboMax: entero(e.comboMax, 0),
      alturaMax: real(e.alturaMax, 0),
    };
  }
  if (typeof valor.ultimaCobrada === "string" && valor.ultimaCobrada.length <= 64) p.ultimaCobrada = valor.ultimaCobrada;
  return p;
}

// --- Lectura, migración y escritura -----------------------------------------

/** Lo que hay en la clave v2: el progreso, `"falta"` si no existe o `"ilegible"` si falla o está corrupta. */
function leerClave(almacen: Almacen | null): Progreso | "falta" | "ilegible" {
  try {
    const texto = almacen?.getItem(CLAVE_PROGRESO);
    if (texto === null || texto === undefined) return almacen ? "falta" : "ilegible";
    return normalizar(JSON.parse(texto)) ?? "ilegible";
  } catch {
    return "ilegible";
  }
}

/**
 * Progreso creado a partir de lo que guardaba la v1 (I2, impacto 2.4): el día
 * jugado queda marcado con `reglas: 1`, sin convertir puntos, sin medalla, sin
 * monedas y sin racha. También el récord libre y el aviso visto que guardaba
 * `torre-diaria:libre`. Las claves viejas no se borran (S20).
 */
export function migrar(almacen: Almacen | null): Progreso {
  const p = progresoVacio();
  const v1 = leerResultadoV1(almacen);
  if (v1) {
    p.diarios[v1.dia] = {
      puntos: 0,
      piezas: v1.puntos,
      altura: v1.altura,
      perfectos: 0,
      colocadas: "",
      enSuDia: true,
      reglas: 1,
    };
  }
  const libre = leerRegistroLibre(almacen);
  p.libre.record = libre.record;
  p.ajustes.tutorialVisto = libre.tutorialVisto;
  return p;
}

/** Progreso guardado; si no hay clave v2, el migrado de la v1; si no se puede leer, uno vacío. */
export function leerProgreso(almacen: Almacen | null): Progreso {
  const leido = leerClave(almacen);
  if (leido === "falta") return migrar(almacen);
  if (leido === "ilegible") return progresoVacio();
  return leido;
}

/** Un solo `setItem`. Devuelve `false` si no se ha podido. */
export function escribirProgreso(almacen: Almacen | null, progreso: Progreso): boolean {
  try {
    if (!almacen) return false;
    almacen.setItem(CLAVE_PROGRESO, JSON.stringify({ ...progreso, version: VERSION_PROGRESO }));
    return true;
  } catch {
    return false;
  }
}

/** Un cambio puro del progreso: recibe uno y devuelve otro, sin tocar el que recibe. */
export type Cambio = (progreso: Progreso) => Progreso;

/**
 * El progreso de la página. `cambiar` relee la clave, aplica el cambio sobre lo
 * leído y lo guarda; si no se puede leer, lo aplica sobre la copia en memoria.
 */
export class Guardado {
  private memoria: Progreso;

  constructor(private readonly almacen: Almacen | null) {
    this.memoria = leerProgreso(almacen);
  }

  get actual(): Progreso {
    return this.memoria;
  }

  /** Vuelve a leer la clave (otra pestaña puede haber guardado). */
  releer(): Progreso {
    const leido = leerClave(this.almacen);
    if (typeof leido !== "string") this.memoria = leido;
    return this.memoria;
  }

  /** Aplica `cambio` y guarda. Devuelve `false` si no se ha podido guardar (el cambio queda en memoria). */
  cambiar(cambio: Cambio): boolean {
    const leido = leerClave(this.almacen);
    this.memoria = cambio(typeof leido === "string" ? this.memoria : leido);
    return escribirProgreso(this.almacen, this.memoria);
  }
}
