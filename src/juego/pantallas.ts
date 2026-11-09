// HUD, barra de abajo, aviso del reto de un amigo, pantalla de fin y copiar
// (compartir y descargar la imagen, en `compartir.ts`). Todo texto que viene del enlace o del almacenamiento se escribe
// con `textContent`, nunca como HTML.
import type { Medalla } from "../logica/economia.ts";
import { formatearAltura, formatearNumero, formatearPiezas, formatearPuntos } from "../logica/tarjeta.ts";
import type { Reto } from "../logica/reto.ts";
import type { Pantalla } from "./flujo.ts";
import { puedeCompartirArchivos } from "./compartir.ts";
import { pintarEstrellas } from "./mapa.ts";

function elemento<T extends HTMLElement = HTMLElement>(id: string): T {
  const encontrado = document.getElementById(id);
  if (!encontrado) throw new Error(`Falta #${id} en la página`);
  return encontrado as T;
}

export const ui = {
  juego: () => elemento("juego"),
  zona: () => elemento("zona"),
  lienzo: () => elemento<HTMLCanvasElement>("lienzo"),
  grano: () => elemento("grano"),
  contador: () => elemento("contador"),
  hud: () => elemento("hud"),
  hudPuntos: () => elemento("hud-puntos"),
  vidas: () => elemento("vidas"),
  combo: () => elemento("combo"),
  record: () => elemento("record"),
  meta: () => elemento("hud-meta"),
  botonRetos: () => elemento<HTMLButtonElement>("boton-retos"),
  botonNiveles: () => elemento<HTMLButtonElement>("boton-niveles"),
  barraEstrellas: () => elemento("barra-estrellas"),
  botonColeccion: () => elemento<HTMLButtonElement>("boton-coleccion"),
  barraRacha: () => elemento("barra-racha"),
  barraMonedas: () => elemento("barra-monedas"),
  avisoToque: () => elemento("aviso-toque"),
  avisoEspecial: () => elemento("aviso-especial"),
  botonSonido: () => elemento<HTMLButtonElement>("boton-sonido"),
  botonVibracion: () => elemento<HTMLButtonElement>("boton-vibracion"),
  reto: () => elemento("reto"),
  avisoReto: () => elemento("aviso-reto"),
  comparacion: () => elemento("comparacion"),
  botonReto: () => elemento<HTMLButtonElement>("boton-reto"),
  botonRepetirReto: () => elemento<HTMLButtonElement>("boton-repetir-reto"),
  botonLibreReto: () => elemento<HTMLButtonElement>("boton-libre-reto"),
  fin: () => elemento("fin"),
  finTitulo: () => elemento("fin-titulo"),
  finPuntos: () => elemento("fin-puntos"),
  finNumero: () => elemento("fin-numero"),
  finUnidad: () => elemento("fin-unidad"),
  finAltura: () => elemento("fin-altura"),
  finRecord: () => elemento("fin-record"),
  finReto: () => elemento("fin-reto"),
  finNuevoRecord: () => elemento("fin-nuevo-record"),
  finMedalla: () => elemento("fin-medalla"),
  finMedallaIcono: () => elemento("fin-medalla-icono"),
  finMedallaTexto: () => elemento("fin-medalla-texto"),
  finMonedas: () => elemento("fin-monedas"),
  finMonedasNumero: () => elemento("fin-monedas-numero"),
  finMonedasTexto: () => elemento("fin-monedas-texto"),
  finDesbloqueo: () => elemento("fin-desbloqueo"),
  finDesbloqueoMuestra: () => elemento<HTMLCanvasElement>("fin-desbloqueo-muestra"),
  finDesbloqueoTexto: () => elemento("fin-desbloqueo-texto"),
  botonEquiparNuevo: () => elemento<HTMLButtonElement>("boton-equipar-nuevo"),
  finSiguiente: () => elemento("fin-siguiente"),
  finNivel: () => elemento("fin-nivel"),
  finObjetivo: () => elemento("fin-objetivo"),
  finEstrellas: () => elemento("fin-estrellas"),
  botonRepetirNivel: () => elemento<HTMLButtonElement>("boton-repetir-nivel"),
  botonMapa: () => elemento<HTMLButtonElement>("boton-mapa"),
  botonLibreNivel: () => elemento<HTMLButtonElement>("boton-libre-nivel"),
  tarjeta: () => elemento("tarjeta"),
  botonCopiar: () => elemento<HTMLButtonElement>("boton-copiar"),
  botonCompartir: () => elemento<HTMLButtonElement>("boton-compartir"),
  botonDescargar: () => elemento<HTMLButtonElement>("boton-descargar"),
  fichaDescargar: () => elemento<HTMLButtonElement>("ficha-descargar"),
  finImagen: () => elemento<HTMLCanvasElement>("fin-imagen"),
  mensaje: () => elemento("mensaje"),
  botonOtraVez: () => elemento<HTMLButtonElement>("boton-otra-vez"),
  retos: () => elemento("retos"),
  niveles: () => elemento("niveles"),
  coleccion: () => elemento("coleccion"),
  botonCerrarRetos: () => elemento<HTMLButtonElement>("cerrar-retos"),
  botonCerrarNiveles: () => elemento<HTMLButtonElement>("cerrar-niveles"),
  botonCerrarColeccion: () => elemento<HTMLButtonElement>("cerrar-coleccion"),
  mensajeColeccion: () => elemento("coleccion-mensaje"),
};

export function cambiarEstado(estado: Pantalla): void {
  ui.juego().dataset.estado = estado;
  ui.reto().hidden = estado !== "reto";
  ui.fin().hidden = estado !== "fin";
  ui.retos().hidden = estado !== "retos";
  ui.niveles().hidden = estado !== "niveles";
  ui.coleccion().hidden = estado !== "coleccion";
}

export function mostrarTexto(nodo: HTMLElement, texto: string | null): void {
  nodo.textContent = texto ?? "";
  nodo.hidden = texto === null;
}

/** Vuelve a lanzar una animación CSS de `clase` en `nodo`, aunque ya la tuviera. */
function reanimar(nodo: Element, clase: string): void {
  nodo.classList.remove("rompe", "vuelve", "late");
  void (nodo as HTMLElement).offsetWidth;
  nodo.classList.add(clase);
}

const ESCALONES = ["cifras-5", "cifras-6", "cifras-7"] as const;

/**
 * Escalón de letra de unos puntos ya formateados (A1): desde «1.000» el número
 * no cabía en la pegatina. 5, 6 y 7 o más caracteres; con menos, `null`.
 */
export function escalonCifras(texto: string): (typeof ESCALONES)[number] | null {
  if (texto.length >= 7) return "cifras-7";
  if (texto.length === 6) return "cifras-6";
  if (texto.length === 5) return "cifras-5";
  return null;
}

/** Pone en `nodo` la clase del escalón de `texto` y quita las demás (sin `style="`, CSP). */
function ponerEscalon(nodo: HTMLElement, texto: string): void {
  const escalon = escalonCifras(texto);
  for (const clase of ESCALONES) nodo.classList.toggle(clase, clase === escalon);
}

export type DatosHud = {
  puntos: number;
  vidas: number;
  /** Vidas que caben en el HUD (iconos). */
  vidasMax: number;
  combo: number;
  /** Récord de la partida libre, o `null` fuera de ella. */
  record: number | null;
  /** Objetivo del nivel en marcha («Nivel 3 · Coloca 5 piezas»), o `null` fuera de los niveles (E3). */
  meta?: string | null;
};

/** HUD de la partida: puntos, vidas como iconos (no caracteres, G11), combo si es 2 o más y récord. */
export function pintarHud({ puntos, vidas, vidasMax, combo, record, meta = null }: DatosHud): void {
  ui.contador().textContent = formatearPuntos(puntos);
  const texto = formatearNumero(puntos);
  ui.hudPuntos().textContent = texto;
  ponerEscalon(ui.hudPuntos(), texto);
  const iconos = ui.vidas();
  iconos.setAttribute("aria-label", vidas === 1 ? "1 vida" : `${vidas} vidas`);
  ui.juego().dataset.vidas = String(vidas);
  const lista = [...iconos.children];
  for (const [i, icono] of lista.entries()) {
    const perdida = i >= vidas;
    // La vida que se pierde se rompe y la que vuelve salta (A3).
    if (perdida !== icono.classList.contains("perdida")) reanimar(icono, perdida ? "rompe" : "vuelve");
    icono.classList.toggle("perdida", perdida);
  }
  for (let i = lista.length; i < vidasMax; i++) {
    const icono = document.createElement("span");
    icono.className = i >= vidas ? "vida perdida" : "vida";
    iconos.append(icono);
  }
  const comboAntes = ui.combo().hidden ? 0 : Number(ui.combo().dataset.combo ?? 0);
  mostrarTexto(ui.combo(), combo >= 2 ? `Combo ×${combo}` : null);
  ui.combo().dataset.combo = String(combo);
  if (combo >= 2 && combo > comboAntes) reanimar(ui.combo(), "late");
  // Con récord 0 (la primera partida) no hay nada que batir: no se muestra.
  mostrarTexto(ui.record(), record === null || record <= 0 ? null : `Récord ${formatearNumero(record)}`);
  mostrarTexto(ui.meta(), meta);
}

/** Barra de abajo (C2, D2, E3): racha en Retos, estrellas en Niveles y monedas en Colección, también para lectores. */
export function pintarBarra({ racha, monedas, estrellas }: { racha: number; monedas: number; estrellas: number }): void {
  ui.barraRacha().textContent = String(racha);
  ui.barraEstrellas().textContent = String(estrellas);
  ui.botonNiveles().setAttribute("aria-label", `Niveles: ${estrellas} ${estrellas === 1 ? "estrella" : "estrellas"}`);
  ui.barraMonedas().textContent = formatearNumero(monedas);
  ui.botonRetos().setAttribute("aria-label", racha > 0 ? `Retos: racha de ${racha} ${racha === 1 ? "día" : "días"}` : "Retos");
  ui.botonColeccion().setAttribute("aria-label", `Colección: ${formatearNumero(monedas)} ${monedas === 1 ? "moneda" : "monedas"}`);
  ui.juego().dataset.monedas = String(monedas);
  ui.juego().dataset.racha = String(racha);
}

export type DatosReto = {
  hoy: number;
  reto: Reto;
  /** ¿Ya hay oficial del día del reto? */
  jugado: boolean;
  /** Sus puntos (`null` si no se ha jugado o es de la v1, que no tiene puntos comparables). */
  puntosDia: number | null;
};

/**
 * Aviso del enlace de un amigo (D3): su marca y el botón para jugar ese día
 * (el oficial de hoy o el atrasado). Si ya se jugó: los dos resultados, «Ver
 * mi resultado» y «Jugar otra vez (no cuenta)».
 */
export function pintarReto({ hoy, reto, jugado, puntosDia }: DatosReto): void {
  ui.avisoReto().textContent = `Tu amigo hizo ${formatearPuntos(reto.puntos)} en el día #${reto.dia}. ¿Le superas?`;
  mostrarTexto(ui.comparacion(), jugado && puntosDia !== null ? `Tú: ${formatearNumero(puntosDia)} · Tu amigo: ${formatearNumero(reto.puntos)}` : null);
  const deHoy = reto.dia === hoy;
  ui.botonReto().textContent = jugado
    ? deHoy
      ? "Ver mi resultado de hoy"
      : `Ver mi resultado del día #${reto.dia}`
    : deHoy
      ? `Jugar el reto de hoy #${hoy}`
      : `Jugar el reto del día #${reto.dia}`;
  ui.botonRepetirReto().hidden = !jugado;
}

/** Aviso del enlace de una partida libre de un amigo (F2): su marca y «Jugar esta partida». */
export function pintarLibreAmigo(puntos: number): void {
  ui.avisoReto().textContent = `Tu amigo hizo ${formatearPuntos(puntos)} en esta partida. ¿Le superas?`;
  mostrarTexto(ui.comparacion(), null);
  ui.botonReto().textContent = "Jugar esta partida";
  ui.botonRepetirReto().hidden = true;
}

export const NOMBRE_MEDALLA: Record<Medalla, string> = { bronce: "Bronce", plata: "Plata", oro: "Oro" };

/** Icono de medalla dibujado con CSS (G11): el metal, o «ninguna» (marca de jugado sin medalla). */
export function pintarMedalla(nodo: HTMLElement, medalla: Medalla | null): void {
  nodo.className = `medalla ${medalla ?? "ninguna"}`;
}

export type DatosFin = {
  titulo: string;
  puntos: number;
  altura: number;
  tarjeta: string;
  /** Récord de la partida libre (ya actualizado), o `null` en el reto diario. */
  record: number | null;
  /** Puntos del amigo si esta partida responde a su reto. */
  puntosAmigo: number | null;
  /** Texto del botón principal: «Otra vez» en la libre, «Partida libre» en el reto. */
  principal: string;
  /** Un día jugado con la v1 se cuenta en piezas, no en puntos (C1). */
  enPiezas?: boolean;
  /** Récord libre superado en esta partida (C2). */
  nuevoRecord?: boolean;
  /** Reto diario: medalla y su texto («Plata · racha de 3 días», D1). */
  diario?: { medalla: Medalla | null; texto: string } | null;
  /** Monedas ganadas; `null` si no se gana nada (resultado guardado, repetición). */
  monedas?: number | null;
  /** Escenario recién desbloqueado (C3). */
  desbloqueo?: { id: string; texto: string } | null;
  /** Siguiente objetivo («Te faltan 120 monedas para Madera», Anexo 1, 2.6). */
  siguiente?: string | null;
  /** Fin de un nivel (E3): objetivo, estrellas de esta partida y botones de nivel. */
  nivel?: { objetivo: string; estrellas: number; victoria: boolean; haySiguiente: boolean } | null;
};

export function textoComparacion(puntos: number, amigo: number): string {
  if (puntos > amigo) return `¡Has batido la marca de tu amigo (${formatearPuntos(amigo)})!`;
  if (puntos === amigo) return `Empate con tu amigo: ${formatearPuntos(amigo)}.`;
  return `Tu amigo sigue por delante: ${formatearPuntos(amigo)}.`;
}

export function pintarFin(datos: DatosFin): void {
  ui.finTitulo().textContent = datos.titulo;
  ui.finPuntos().textContent = datos.enPiezas ? formatearPiezas(datos.puntos) : formatearPuntos(datos.puntos);
  ui.finUnidad().textContent = datos.enPiezas ? (datos.puntos === 1 ? "pieza" : "piezas") : datos.puntos === 1 ? "punto" : "puntos";
  // El escalón va por la cifra final, no por la del recuento.
  ponerEscalon(ui.finNumero(), formatearNumero(datos.puntos));
  contar(ui.finNumero(), datos.puntos);
  ui.finAltura().textContent = formatearAltura(datos.altura);
  mostrarTexto(ui.finRecord(), datos.record === null ? null : `Récord ${formatearNumero(datos.record)}`);
  mostrarTexto(ui.finReto(), datos.puntosAmigo === null ? null : textoComparacion(datos.puntos, datos.puntosAmigo));
  ui.finNuevoRecord().hidden = !datos.nuevoRecord;
  ui.finMedalla().hidden = !datos.diario;
  if (datos.diario) {
    pintarMedalla(ui.finMedallaIcono(), datos.diario.medalla);
    ui.finMedallaTexto().textContent = datos.diario.texto;
  }
  const monedas = datos.monedas ?? null;
  ui.finMonedas().hidden = monedas === null;
  ui.juego().dataset.ganadas = String(monedas ?? 0);
  if (monedas !== null) {
    ui.finMonedasTexto().textContent = `${formatearNumero(monedas)} ${monedas === 1 ? "moneda" : "monedas"}`;
    contar(ui.finMonedasNumero(), monedas, "+");
  }
  ui.finDesbloqueo().hidden = !datos.desbloqueo;
  if (datos.desbloqueo) {
    ui.finDesbloqueoTexto().textContent = datos.desbloqueo.texto;
    ui.botonEquiparNuevo().dataset.articulo = datos.desbloqueo.id;
    // «Usar» se oculta al pulsarlo: con otro escenario nuevo en la misma sesión vuelve a salir.
    ui.botonEquiparNuevo().hidden = false;
  }
  mostrarTexto(ui.finSiguiente(), datos.siguiente ?? null);
  const nivel = datos.nivel ?? null;
  ui.finNivel().hidden = !nivel;
  ui.botonRepetirNivel().hidden = !nivel || !nivel.victoria || !nivel.haySiguiente;
  ui.botonMapa().hidden = !nivel;
  ui.botonLibreNivel().hidden = !nivel;
  if (nivel) {
    ui.finObjetivo().textContent = `${nivel.victoria ? "Superado" : "Sin superar"}: ${nivel.objetivo}`;
    pintarEstrellas(ui.finEstrellas(), nivel.estrellas);
    // Las estrellas aparecen una a una (con movimiento reducido, todas a la vez).
    ui.finEstrellas().classList.remove("aparecen");
    void ui.finEstrellas().offsetWidth;
    ui.finEstrellas().classList.add("aparecen");
  }
  ui.tarjeta().textContent = datos.tarjeta;
  ui.mensaje().textContent = "";
  // F3: con archivos en `share`, «Compartir» lleva la imagen; si no, se ofrece «Descargar imagen».
  ui.botonCompartir().hidden = typeof navigator.share !== "function";
  ui.botonDescargar().hidden = puedeCompartirArchivos();
  ui.botonOtraVez().textContent = datos.principal;
}

/** Duración del recuento de puntos en el fin (Anexo 1, 1.5). */
export const RECUENTO_MS = 800;
const recuentos = new WeakMap<HTMLElement, number>();

/**
 * Recuento de 0 a `puntos` en `RECUENTO_MS`, solo visual (el número exacto
 * está en un texto para lectores y en `data-*` para las pruebas). Con
 * movimiento reducido, directo. Puntos y monedas cuentan a la vez (C2).
 */
function contar(nodo: HTMLElement, puntos: number, prefijo = ""): void {
  const vez = (recuentos.get(nodo) ?? 0) + 1;
  recuentos.set(nodo, vez);
  const directo = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || puntos <= 0;
  if (directo) {
    nodo.textContent = prefijo + formatearNumero(puntos);
    return;
  }
  const desde = performance.now();
  const paso = (ahora: number) => {
    if (vez !== recuentos.get(nodo)) return;
    const t = Math.min(1, (ahora - desde) / RECUENTO_MS);
    nodo.textContent = prefijo + formatearNumero(Math.round(puntos * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(paso);
  };
  nodo.textContent = `${prefijo}0`;
  requestAnimationFrame(paso);
}

/** Copia con el portapapeles y, si no está, con un `textarea` seleccionado. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Sigue con la alternativa.
  }
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.className = "fuera-de-vista";
  document.body.append(area);
  area.select();
  let copiado = false;
  try {
    copiado = document.execCommand("copy");
  } catch {
    copiado = false;
  }
  area.remove();
  return copiado;
}
