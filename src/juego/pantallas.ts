// HUD, pantalla de inicio, aviso del reto de un amigo, pantalla de fin y copiar
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
  botonPausa: () => elemento<HTMLButtonElement>("boton-pausa"),
  inicio: () => elemento("inicio"),
  inicioMonedas: () => elemento<HTMLButtonElement>("inicio-monedas"),
  inicioMonedasNumero: () => elemento("inicio-monedas-numero"),
  inicioAjustes: () => elemento<HTMLButtonElement>("inicio-ajustes"),
  inicioSiguiente: () => elemento("inicio-siguiente"),
  botonJugar: () => elemento<HTMLButtonElement>("inicio-jugar"),
  tarjetaReto: () => elemento<HTMLButtonElement>("tarjeta-reto"),
  tarjetaRacha: () => elemento("tarjeta-racha"),
  tarjetaRetoMarca: () => elemento("tarjeta-reto-marca"),
  tarjetaRetoTexto: () => elemento("tarjeta-reto-texto"),
  tarjetaNiveles: () => elemento<HTMLButtonElement>("tarjeta-niveles"),
  tarjetaEstrellas: () => elemento("tarjeta-estrellas"),
  tarjetaNivel: () => elemento("tarjeta-nivel"),
  tarjetaTienda: () => elemento<HTMLButtonElement>("tarjeta-tienda"),
  pausa: () => elemento("pausa"),
  pausaTexto: () => elemento("pausa-texto"),
  botonSeguir: () => elemento<HTMLButtonElement>("boton-seguir"),
  pausaAjustes: () => elemento<HTMLButtonElement>("pausa-ajustes"),
  pausaInicio: () => elemento<HTMLButtonElement>("pausa-inicio"),
  barraObjetos: () => elemento("barra-objetos"),
  objetoReloj: () => elemento<HTMLButtonElement>("objeto-reloj"),
  objetoCemento: () => elemento<HTMLButtonElement>("objeto-cemento"),
  seguir: () => elemento("seguir"),
  seguirTitulo: () => elemento("seguir-titulo"),
  seguirTexto: () => elemento("seguir-texto"),
  seguirCorazon: () => elemento<HTMLButtonElement>("seguir-corazon"),
  seguirMonedas: () => elemento<HTMLButtonElement>("seguir-monedas"),
  seguirVideo: () => elemento<HTMLButtonElement>("seguir-video"),
  seguirNo: () => elemento<HTMLButtonElement>("seguir-no"),
  finObjeto: () => elemento("fin-objeto"),
  ajustes: () => elemento("ajustes"),
  ajusteMusica: () => elemento<HTMLButtonElement>("ajuste-musica"),
  ajusteSonidos: () => elemento<HTMLButtonElement>("ajuste-sonidos"),
  ajusteVibracion: () => elemento<HTMLButtonElement>("ajuste-vibracion"),
  botonCreditos: () => elemento<HTMLButtonElement>("boton-creditos"),
  creditos: () => elemento("creditos"),
  ajustesVersion: () => elemento("ajustes-version"),
  botonCerrarAjustes: () => elemento<HTMLButtonElement>("cerrar-ajustes"),
  avisoToque: () => elemento("aviso-toque"),
  avisoEspecial: () => elemento("aviso-especial"),
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
  botonInicio: () => elemento<HTMLButtonElement>("boton-inicio"),
  retos: () => elemento("retos"),
  niveles: () => elemento("niveles"),
  tienda: () => elemento("tienda"),
  botonCerrarRetos: () => elemento<HTMLButtonElement>("cerrar-retos"),
  botonCerrarNiveles: () => elemento<HTMLButtonElement>("cerrar-niveles"),
  botonCerrarTienda: () => elemento<HTMLButtonElement>("cerrar-tienda"),
  mensajeTienda: () => elemento("tienda-mensaje"),
};

/**
 * Muestra la pantalla `estado`. `debajo` es la pantalla sobre la que se abre
 * un panel: si es el inicio, el HUD sigue oculto (lo oculta el CSS con
 * `data-debajo`).
 */
export function cambiarEstado(estado: Pantalla, debajo: Pantalla | null = null): void {
  const juego = ui.juego();
  juego.dataset.estado = estado;
  if (debajo) juego.dataset.debajo = debajo;
  else delete juego.dataset.debajo;
  ui.inicio().hidden = estado !== "inicio";
  ui.pausa().hidden = estado !== "pausa";
  ui.seguir().hidden = estado !== "seguir";
  ui.ajustes().hidden = estado !== "ajustes";
  ui.reto().hidden = estado !== "reto";
  ui.fin().hidden = estado !== "fin";
  ui.retos().hidden = estado !== "retos";
  ui.niveles().hidden = estado !== "niveles";
  ui.tienda().hidden = estado !== "tienda";
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

export type DatosInicio = {
  monedas: number;
  racha: number;
  /** Día de hoy y, si ya se jugó su oficial, su medalla y sus puntos. */
  hoy: number;
  jugadoHoy: { medalla: Medalla | null; puntos: number } | null;
  /** Siguiente nivel disponible y estrellas totales. */
  nivel: number;
  estrellas: number;
  /** Objetivo cercano («Te faltan 120 monedas para Madera»), o `null` (Anexo B). */
  siguiente: string | null;
};

/**
 * Pantalla de inicio (E2, Anexo B): monedas, reto de hoy (sin jugar con un
 * punto rosa, o su medalla y puntos; la racha sobre la llama), niveles
 * (siguiente nivel y estrellas) y el objetivo cercano. También para lectores.
 */
export function pintarInicio({ monedas, racha, hoy, jugadoHoy, nivel, estrellas, siguiente }: DatosInicio): void {
  const textoMonedas = formatearNumero(monedas);
  ui.inicioMonedasNumero().textContent = textoMonedas;
  ui.inicioMonedas().setAttribute("aria-label", `Tienda: ${textoMonedas} ${monedas === 1 ? "moneda" : "monedas"}`);
  ui.tarjetaRacha().textContent = String(racha);
  const marca = ui.tarjetaRetoMarca();
  if (jugadoHoy) {
    pintarMedalla(marca, jugadoHoy.medalla);
    ui.tarjetaRetoTexto().textContent = formatearNumero(jugadoHoy.puntos);
  } else {
    marca.className = "punto";
    ui.tarjetaRetoTexto().textContent = "Sin jugar";
  }
  const estadoReto = jugadoHoy
    ? `${jugadoHoy.medalla ? NOMBRE_MEDALLA[jugadoHoy.medalla] : "sin medalla"}, ${formatearPuntos(jugadoHoy.puntos)}`
    : "sin jugar";
  const textoRacha = racha > 0 ? `. Racha de ${racha} ${racha === 1 ? "día" : "días"}` : "";
  ui.tarjetaReto().setAttribute("aria-label", `Reto de hoy #${hoy}: ${estadoReto}${textoRacha}`);
  ui.tarjetaEstrellas().textContent = String(estrellas);
  ui.tarjetaNivel().textContent = `Nivel ${nivel}`;
  ui.tarjetaNiveles().setAttribute("aria-label", `Niveles: nivel ${nivel}, ${estrellas} ${estrellas === 1 ? "estrella" : "estrellas"}`);
  mostrarTexto(ui.inicioSiguiente(), siguiente);
  ui.juego().dataset.monedas = String(monedas);
  ui.juego().dataset.racha = String(racha);
}

/** Pausa (E3): en el reto diario no hay «Inicio» (R-3) y se recuerda que cuenta al acabar. */
export function pintarPausa({ titulo, sinSalida }: { titulo: string; sinSalida: boolean }): void {
  ui.pausaTexto().textContent = sinSalida ? `${titulo}: cuenta al acabar la partida.` : titulo;
  ui.pausaInicio().hidden = sinSalida;
}

/** Cómo se ve un objeto en la barra: oculto si aún está bloqueado; con 0, «+». */
export type ObjetoEnBarra = { desbloqueado: boolean; cuantos: number; activo: boolean };

/**
 * Barra de objetos (I3): solo con algún objeto desbloqueado, y solo los
 * desbloqueados. Con unidades, el número y activo solo con la pieza colgando;
 * con 0, «+» (abre la Tienda encima de la partida).
 */
export function pintarBarraObjetos(visible: boolean, objetos: { reloj: ObjetoEnBarra; cemento: ObjetoEnBarra }): void {
  ui.barraObjetos().hidden = !visible || (!objetos.reloj.desbloqueado && !objetos.cemento.desbloqueado);
  for (const [boton, { desbloqueado, cuantos, activo }, nombre] of [
    [ui.objetoReloj(), objetos.reloj, "Reloj de arena"],
    [ui.objetoCemento(), objetos.cemento, "Cemento"],
  ] as const) {
    boton.hidden = !desbloqueado;
    boton.dataset.cuantos = String(cuantos);
    boton.querySelector(".cuenta")!.textContent = cuantos > 0 ? String(cuantos) : "+";
    boton.setAttribute("aria-label", cuantos > 0 ? `${nombre}: ${cuantos === 1 ? "queda 1" : `quedan ${cuantos}`}` : `${nombre}: conseguir más`);
    boton.disabled = cuantos > 0 && !activo;
  }
}

/** «¿Seguir?» (I3): un botón por cada forma de pagar que haya; «No, ver resultado» siempre. */
export function pintarSeguir({ puntos, corazones, precio, pagos }: { puntos: number; corazones: number; precio: number; pagos: readonly string[] }): void {
  ui.seguirTexto().textContent = `${formatearPuntos(puntos)}. Sigue con 1 vida, una vez por partida.`;
  ui.seguirCorazon().hidden = !pagos.includes("corazon");
  ui.seguirCorazon().textContent = `Usar corazón (tienes ${corazones})`;
  ui.seguirMonedas().hidden = !pagos.includes("monedas");
  ui.seguirMonedas().textContent = `${formatearNumero(precio)} monedas`;
  ui.seguirVideo().hidden = !pagos.includes("video");
}

/** Interruptor de Ajustes (C2): `aria-checked` dice si está encendido. */
export function pintarInterruptor(boton: HTMLButtonElement, encendido: boolean): void {
  boton.setAttribute("aria-checked", String(encendido));
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
