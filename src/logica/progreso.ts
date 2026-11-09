// Progreso guardado v2 (C1) y v3 (C1 de la tercera versión): todo lo que el
// juego recuerda en el navegador va en una sola clave, `torre-diaria:progreso`,
// con su versión. Al leer se valida campo a campo, como en `registro.ts`: lo
// que no se entiende se ignora y, si nada se entiende, se empieza de cero sin
// borrar la clave hasta el primer guardado. Si el almacenamiento falla, el
// juego sigue con lo que tiene en memoria (G10). Cada guardado relee la clave y
// aplica el cambio sobre lo leído, así dos pestañas no se pisan las monedas
// (impacto, 2.4). La v3 solo añade campos: ninguno de la v2 cambia de nombre
// ni de tipo, así que el código de la v2 aún lee un guardado v3 (Decisión
// T31), aunque al guardar borra lo nuevo.
import { leerRegistroLibre, leerResultadoV1, type Almacen } from "./registro.ts";

export const CLAVE_PROGRESO = "torre-diaria:progreso";
export const VERSION_PROGRESO = 3;

/** Objetos de ayuda (Anexo H): como mucho `MAX_OBJETO` de cada uno. */
export const OBJETOS = ["reloj", "cemento", "corazon"] as const;
export type Objeto = (typeof OBJETOS)[number];
export const MAX_OBJETO = 9;
/** Compras acreditadas que se recuerdan (las más recientes). */
export const MAX_TRANSACCIONES = 50;
/** Avisos de piezas especiales ya vistos: hay 3 tipos; el tope es contra datos raros. */
const MAX_VISTOS = 16;
/** 2100-01-01 en ms: una fecha mayor no es real (vídeos y compras). */
const FECHA_MAXIMA = 4_102_444_800_000;

/**
 * Compra con dinero ya acreditada (C1, impacto: con producto y monedas, para
 * saber cuántas monedas compradas quedan sin gastar). `fecha` en ms.
 */
export type Transaccion = { id: string; producto: string; monedas: number; fecha: number };

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
  /** 1: jugado con la v1 (sin puntos de la v2, sin medalla); 2 o más: versión de las reglas con que se jugó (`REGLAS` en las nuevas). */
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
  /** `sonido` son los efectos; desde la v3 la música va aparte (Decisión T7). */
  ajustes: { sonido: boolean; vibracion: boolean; tutorialVisto: boolean; musica: boolean };
  /** `partidas` (v3): libres, oficiales y de nivel terminadas; desbloquea objetos. */
  estadisticas: { piezas: number; perfectos: number; comboMax: number; alturaMax: number; partidas: number };
  /** Identificador (`PartidaAcabada.id`) de la última partida libre cobrada: la misma partida no se cobra dos veces (C2). */
  ultimaCobrada: string;
  /** Inventario de objetos de ayuda y los ya desbloqueados (v3). */
  objetos: Record<Objeto, number> & { desbloqueados: Objeto[] };
  /** Vídeos con premio (v3): ms del último de monedas, día del último objeto por vídeo y cuántos ese día. */
  recompensas: { ultimoVideoMonedas: number; diaObjetoVideo: number; objetosVideo: number };
  /** Compras con dinero acreditadas (v3), como mucho `MAX_TRANSACCIONES`, la más reciente al final. */
  compras: { transacciones: Transaccion[] };
  /** Piezas especiales cuyo aviso ya se ha visto en este navegador (v3). */
  vistos: string[];
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
    ajustes: { sonido: true, vibracion: true, tutorialVisto: false, musica: true },
    estadisticas: { piezas: 0, perfectos: 0, comboMax: 0, alturaMax: 0, partidas: 0 },
    ultimaCobrada: "",
    objetos: { reloj: 0, cemento: 0, corazon: 0, desbloqueados: [] },
    recompensas: { ultimoVideoMonedas: 0, diaObjetoVideo: 0, objetosVideo: 0 },
    compras: { transacciones: [] },
    vistos: [],
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

function esObjetoDeAyuda(valor: unknown): valor is Objeto {
  return typeof valor === "string" && (OBJETOS as readonly string[]).includes(valor);
}

/** Id de transacción del proveedor: corto y sin caracteres raros. */
function esIdTransaccion(valor: unknown): valor is string {
  return typeof valor === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(valor);
}

function leerTransaccion(valor: unknown): Transaccion | null {
  if (!esObjeto(valor) || !esIdTransaccion(valor.id) || !esId(valor.producto)) return null;
  const monedas = entero(valor.monedas, -1);
  const fecha = entero(valor.fecha, -1);
  if (monedas < 0 || fecha < 0 || fecha > FECHA_MAXIMA) return null;
  return { id: valor.id, producto: valor.producto, monedas, fecha };
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
    const sonido = booleano(a.sonido, true);
    p.ajustes = {
      sonido,
      vibracion: booleano(a.vibracion, true),
      tutorialVisto: booleano(a.tutorialVisto, false),
      // Sin música guardada (la v2), la del sonido: quien lo silenció no oye música de repente.
      musica: booleano(a.musica, sonido),
    };
  }
  // Sin partidas guardadas (la v2): libres, días jugados y niveles con estrellas.
  const partidasV2 = p.libre.partidas + Object.keys(p.diarios).length + Object.values(p.niveles).filter((n) => n > 0).length;
  p.estadisticas.partidas = partidasV2;
  if (esObjeto(valor.estadisticas)) {
    const e = valor.estadisticas;
    p.estadisticas = {
      piezas: entero(e.piezas, 0),
      perfectos: entero(e.perfectos, 0),
      comboMax: entero(e.comboMax, 0),
      alturaMax: real(e.alturaMax, 0),
      partidas: entero(e.partidas, partidasV2),
    };
  }
  if (typeof valor.ultimaCobrada === "string" && valor.ultimaCobrada.length <= 64) p.ultimaCobrada = valor.ultimaCobrada;
  if (esObjeto(valor.objetos)) {
    const o = valor.objetos;
    for (const objeto of OBJETOS) p.objetos[objeto] = Math.min(MAX_OBJETO, entero(o[objeto], 0));
    if (Array.isArray(o.desbloqueados)) p.objetos.desbloqueados = [...new Set(o.desbloqueados.filter(esObjetoDeAyuda))];
  }
  if (esObjeto(valor.recompensas)) {
    const r = valor.recompensas;
    // Una fecha posterior a 2100 no es real. Una solo futura se queda: la
    // política de vídeos (K2) la trata con la hora de ese momento.
    const ultimo = entero(r.ultimoVideoMonedas, 0);
    const dia = entero(r.diaObjetoVideo, 0);
    p.recompensas = {
      ultimoVideoMonedas: ultimo <= FECHA_MAXIMA ? ultimo : 0,
      diaObjetoVideo: dia <= 999_999 ? dia : 0,
      objetosVideo: Math.min(MAX_OBJETO, entero(r.objetosVideo, 0)),
    };
  }
  if (esObjeto(valor.compras) && Array.isArray(valor.compras.transacciones)) {
    const ids = new Set<string>();
    const transacciones: Transaccion[] = [];
    for (const t of valor.compras.transacciones) {
      const leida = leerTransaccion(t);
      if (!leida || ids.has(leida.id)) continue;
      ids.add(leida.id);
      transacciones.push(leida);
    }
    // Las más recientes van al final: si sobran, se quitan las primeras.
    p.compras.transacciones = transacciones.slice(-MAX_TRANSACCIONES);
  }
  if (Array.isArray(valor.vistos)) p.vistos = [...new Set(valor.vistos.filter(esId))].slice(0, MAX_VISTOS);
  return p;
}

// --- Lectura, migración y escritura -----------------------------------------

/** Lo que hay en la clave (v2 o v3): el progreso, `"falta"` si no existe o `"ilegible"` si falla o está corrupta. */
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
  // Sin propiedades en el constructor: los scripts de Node cargan este archivo sin compilar.
  private readonly almacen: Almacen | null;

  constructor(almacen: Almacen | null) {
    this.almacen = almacen;
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
