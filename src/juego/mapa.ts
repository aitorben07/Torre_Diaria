// Pantalla Niveles (F1, Anexo D): el mapa del Puerto ocupa la columna y se lee
// de abajo arriba: un camino en zigzag con los 10 niveles como pegatinas
// (número, estrellas o candado). En los márgenes, «Volver», el mundo, las
// estrellas y las monedas, y abajo «Jugar nivel N» con el último disponible,
// que queda centrado al abrir. Tocar un nivel abre su ventana (objetivo,
// umbrales de estrellas, «Jugar» y «Cerrar»). Todo el DOM se crea con
// `createElement` y `textContent`; las posiciones van en clases, no en
// atributos `style` (G6).
import { ESTRELLAS_POR_NIVEL, estrellasGuardadas, NIVELES, nivelDisponible, nivelPorNumero, textoObjetivo, totalEstrellas, ultimoDisponible } from "../logica/niveles.ts";
import type { Progreso } from "../logica/progreso.ts";
import { formatearNumero } from "../logica/tarjeta.ts";

const SVG = "http://www.w3.org/2000/svg";
/** Estrella de cinco puntas en un `viewBox` de 24 (G11: nunca un carácter). */
export const RUTA_ESTRELLA = "M12 2.6l2.8 5.9 6.5.8-4.8 4.5 1.2 6.4L12 17l-5.7 3.2 1.2-6.4-4.8-4.5 6.5-.8z";
const RUTA_CANDADO = "M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13z";
/** Columna de cada nivel en el zigzag, en % del ancho: centro, derecha, centro, izquierda… */
export const COLUMNAS = [50, 76, 50, 24] as const;
/** Alto de cada fila del mapa en unidades del `viewBox` del sendero. */
const FILA = 10;

export function iconoEstrella(llena: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("estrella", llena ? "llena" : "vacia");
  const ruta = document.createElementNS(SVG, "path");
  ruta.setAttribute("d", RUTA_ESTRELLA);
  svg.append(ruta);
  return svg;
}

/** Tres estrellas dibujadas, `estrellas` de ellas llenas, con su texto para lectores. */
export function pintarEstrellas(caja: HTMLElement, estrellas: number): void {
  caja.replaceChildren(...Array.from({ length: ESTRELLAS_POR_NIVEL }, (_, i) => iconoEstrella(i < estrellas)));
  caja.setAttribute("aria-label", estrellas === 1 ? "1 estrella de 3" : `${estrellas} estrellas de 3`);
  caja.dataset.estrellas = String(estrellas);
}

/**
 * Sendero del mapa: curvas entre los centros de las fichas, de abajo arriba,
 * en un `viewBox` de 100 de ancho y `FILA` de alto por nivel. Con `hasta`, solo
 * el tramo del muelle a la ficha `hasta` (el camino ya abierto).
 */
export function rutaSendero(niveles: number, hasta: number = niveles): string {
  const punto = (i: number) => ({ x: COLUMNAS[i % COLUMNAS.length]!, y: (niveles - i - 0.5) * FILA });
  let d = "";
  for (let i = 0; i < Math.min(niveles, hasta); i++) {
    const { x, y } = punto(i);
    if (i === 0) {
      d += `M${x} ${y + FILA / 2}L${x} ${y}`;
      continue;
    }
    const antes = punto(i - 1);
    d += `C${antes.x} ${antes.y - FILA / 2} ${x} ${y + FILA / 2} ${x} ${y}`;
  }
  return d;
}

export type AccionesNiveles = { jugar(nivel: number): void };

const porId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Colores de las pegatinas ya superadas, por turno: el camino hecho se ve variado, como una hoja de pegatinas. */
const TINTAS_HECHO = 4;

export class PanelNiveles {
  /** Nivel de la ventana abierta (o de la última que se abrió). */
  private elegido = 1;

  constructor(
    private readonly acciones: AccionesNiveles,
    private readonly progreso: () => Progreso,
  ) {
    porId("niveles-jugar").addEventListener("click", () => this.jugar(ultimoDisponible(this.progreso())));
    porId("ficha-nivel-jugar").addEventListener("click", () => this.jugar(this.elegido));
    porId("ventana-nivel-cerrar").addEventListener("click", () => this.cerrarVentana());
    // Tocar fuera del papel (en el fondo oscurecido) también la cierra.
    const ventana = this.ventana();
    ventana.addEventListener("click", (evento) => {
      if (evento.target === ventana) this.cerrarVentana();
    });
    const sendero = porId("mapa-sendero") as unknown as SVGSVGElement;
    sendero.setAttribute("viewBox", `0 0 100 ${NIVELES.length * FILA}`);
    // El camino es una cinta de papel con borde de tinta (su doble impresión azul la pone el CSS); el tramo abierto lleva puntos encima.
    const capas = ["borde", "cinta", "hecho"].map((clase) => {
      const ruta = document.createElementNS(SVG, "path");
      ruta.setAttribute("d", rutaSendero(NIVELES.length));
      ruta.classList.add(clase);
      return ruta;
    });
    sendero.replaceChildren(...capas);
  }

  private ventana(): HTMLDialogElement {
    return porId<HTMLDialogElement>("ventana-nivel");
  }

  ventanaAbierta(): boolean {
    return this.ventana().open;
  }

  /** Cierra la ventana del nivel; el foco vuelve a su pegatina (lo hace el propio `<dialog>`). */
  cerrarVentana(): void {
    if (this.ventanaAbierta()) this.ventana().close();
  }

  private jugar(nivel: number): void {
    if (!nivelDisponible(this.progreso(), nivel)) return;
    this.cerrarVentana();
    this.acciones.jugar(nivel);
  }

  /** Al abrir (con el panel ya visible): el último nivel disponible, centrado en el mapa. */
  abrir(): void {
    this.cerrarVentana();
    this.pintar();
    const mapa = porId("mapa");
    const ficha = porId(`nivel-${ultimoDisponible(this.progreso())}`);
    const caja = mapa.getBoundingClientRect();
    const deFicha = ficha.getBoundingClientRect();
    mapa.scrollTop += deFicha.top + deFicha.height / 2 - (caja.top + caja.height / 2);
  }

  pintar(): void {
    const p = this.progreso();
    porId("niveles-estrellas").textContent = String(totalEstrellas(p));
    porId("niveles-estrellas-total").textContent = `/${NIVELES.length * ESTRELLAS_POR_NIVEL}`;
    porId("niveles-monedas").textContent = formatearNumero(p.monedas);
    const ultimo = ultimoDisponible(p);
    porId("niveles-jugar").textContent = `Jugar nivel ${ultimo}`;
    porId("mapa-niveles").replaceChildren(
      ...NIVELES.map((nivel) => {
        const estrellas = estrellasGuardadas(p, nivel.numero);
        const abierto = nivelDisponible(p, nivel.numero);
        const fila = document.createElement("li");
        fila.className = `fila x${(nivel.numero - 1) % COLUMNAS.length}`;
        const boton = document.createElement("button");
        boton.type = "button";
        boton.id = `nivel-${nivel.numero}`;
        const estado = !abierto ? "bloqueado" : estrellas > 0 ? `hecho t${(nivel.numero - 1) % TINTAS_HECHO}` : "actual";
        boton.className = `nivel-boton ${estado}${nivel.jefe ? " jefe" : ""}`;
        boton.dataset.estrellas = String(estrellas);
        boton.disabled = !abierto;
        if (abierto) boton.setAttribute("aria-haspopup", "dialog");
        const etiqueta = !abierto ? "bloqueado" : estrellas > 0 ? (estrellas === 1 ? "1 estrella" : `${estrellas} estrellas`) : "sin completar";
        boton.setAttribute("aria-label", `Nivel ${nivel.numero}${nivel.jefe ? " (jefe)" : ""}: ${etiqueta}`);
        const numero = document.createElement("span");
        numero.className = "numero";
        numero.textContent = String(nivel.numero);
        boton.append(numero);
        if (!abierto) boton.append(candado());
        if (nivel.jefe) boton.append(corona());
        boton.addEventListener("click", () => this.abrirVentana(nivel.numero));
        fila.append(boton);
        if (abierto) {
          const caja = document.createElement("span");
          caja.className = "estrellas";
          pintarEstrellas(caja, estrellas);
          fila.append(caja);
        }
        // «Estás aquí»: la pieza con ojos espera sobre el último nivel disponible.
        if (nivel.numero === ultimo) {
          fila.classList.add("aqui");
          fila.append(avatar());
        }
        return fila;
      }),
    );
    // Hasta dónde se ha completado el camino: el trazo de color llega a la ficha del último disponible.
    porId("mapa-sendero").dataset.hasta = String(ultimo);
    const hecho = porId("mapa-sendero").querySelector("path.hecho");
    hecho?.setAttribute("d", rutaSendero(NIVELES.length, ultimo));
  }

  /** Ventana del nivel (F1): título, estrellas, objetivo, umbrales y «Jugar» o «Repetir». */
  private abrirVentana(numero: number): void {
    const p = this.progreso();
    if (!nivelDisponible(p, numero)) return;
    this.elegido = numero;
    const nivel = nivelPorNumero(numero) ?? NIVELES[0]!;
    const estrellas = estrellasGuardadas(p, nivel.numero);
    porId("ficha-nivel-titulo").textContent = `Nivel ${nivel.numero}${nivel.jefe ? " · Jefe" : ""}`;
    porId("ficha-nivel-objetivo").textContent = textoObjetivo(nivel);
    pintarEstrellas(porId("ficha-nivel-estrellas"), estrellas);
    porId("ficha-nivel-detalle").textContent = estrellas >= ESTRELLAS_POR_NIVEL ? "Completado con 3 estrellas" : `2 estrellas: ${formatearNumero(nivel.p2)} puntos · 3: ${formatearNumero(nivel.p3)}`;
    const jugar = porId<HTMLButtonElement>("ficha-nivel-jugar");
    const verbo = estrellas > 0 ? "Repetir" : "Jugar";
    jugar.textContent = verbo;
    jugar.setAttribute("aria-label", `${verbo} el nivel ${nivel.numero}`);
    this.ventana().showModal();
  }
}

/** Pieza turquesa con dos ojos, la del juego: marca en el mapa dónde está el jugador. */
function avatar(): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("avatar");
  for (const [clase, desplazamiento] of [
    ["registro", 6],
    ["cuerpo", 3],
  ] as const) {
    const rect = document.createElementNS(SVG, "rect");
    rect.setAttribute("x", String(desplazamiento));
    rect.setAttribute("y", String(desplazamiento));
    rect.setAttribute("width", "23");
    rect.setAttribute("height", "23");
    rect.setAttribute("rx", "4");
    rect.classList.add(clase);
    svg.append(rect);
  }
  for (const cx of [11, 20]) {
    const ojo = document.createElementNS(SVG, "circle");
    ojo.setAttribute("cx", String(cx));
    ojo.setAttribute("cy", "13");
    ojo.setAttribute("r", "2.6");
    ojo.classList.add("ojo");
    svg.append(ojo);
  }
  return svg;
}

/** Corona del nivel jefe, encima de su pegatina. */
function corona(): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 16");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("corona");
  const ruta = document.createElementNS(SVG, "path");
  ruta.setAttribute("d", "M2 14L3.5 3l5 5L12 1.5 15.5 8l5-5L22 14z");
  svg.append(ruta);
  return svg;
}

function candado(): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("candado");
  const ruta = document.createElementNS(SVG, "path");
  ruta.setAttribute("d", RUTA_CANDADO);
  svg.append(ruta);
  return svg;
}
