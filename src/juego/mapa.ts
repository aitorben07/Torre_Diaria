// Pantalla Niveles (E3): la ficha del nivel elegido (objetivo, estrellas y
// «Jugar») arriba, y debajo el mapa del Puerto, que se lee de abajo arriba: un
// camino en zigzag con los 10 niveles como fichas redondas (número, estrellas
// o candado). Al abrir, el último nivel disponible queda centrado en el mapa.
// Todo el DOM se crea con `createElement` y `textContent`; las posiciones van
// en clases, no en atributos `style` (G6).
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

export class PanelNiveles {
  private elegido = 1;

  constructor(
    private readonly acciones: AccionesNiveles,
    private readonly progreso: () => Progreso,
  ) {
    porId("ficha-nivel-jugar").addEventListener("click", () => this.acciones.jugar(this.elegido));
    const sendero = porId("mapa-sendero") as unknown as SVGSVGElement;
    sendero.setAttribute("viewBox", `0 0 100 ${NIVELES.length * FILA}`);
    // El camino es una cinta de papel con borde de tinta; el tramo abierto lleva puntos encima.
    const capas = ["borde", "cinta", "hecho"].map((clase) => {
      const ruta = document.createElementNS(SVG, "path");
      ruta.setAttribute("d", rutaSendero(NIVELES.length));
      ruta.classList.add(clase);
      return ruta;
    });
    sendero.replaceChildren(...capas);
  }

  /** Al abrir: elegido el último nivel disponible y centrado en el mapa (con el panel ya visible). */
  abrir(): void {
    this.elegido = ultimoDisponible(this.progreso());
    this.pintar();
    const mapa = porId("mapa");
    const ficha = porId(`nivel-${this.elegido}`);
    const caja = mapa.getBoundingClientRect();
    const deFicha = ficha.getBoundingClientRect();
    mapa.scrollTop += deFicha.top + deFicha.height / 2 - (caja.top + caja.height / 2);
  }

  pintar(): void {
    const p = this.progreso();
    const total = totalEstrellas(p);
    porId("niveles-estrellas").textContent = String(total);
    porId("niveles-estrellas-total").textContent = `/${NIVELES.length * ESTRELLAS_POR_NIVEL}`;
    const ultimo = ultimoDisponible(p);
    // Hasta dónde se ha completado el camino: el trazo de color llega a la ficha del último disponible.
    porId("mapa-niveles").replaceChildren(
      ...NIVELES.map((nivel) => {
        const estrellas = estrellasGuardadas(p, nivel.numero);
        const abierto = nivelDisponible(p, nivel.numero);
        const fila = document.createElement("li");
        fila.className = `fila x${(nivel.numero - 1) % COLUMNAS.length}`;
        const boton = document.createElement("button");
        boton.type = "button";
        boton.id = `nivel-${nivel.numero}`;
        const estado = !abierto ? "bloqueado" : estrellas > 0 ? "hecho" : "actual";
        boton.className = `nivel-boton ${estado}${nivel.jefe ? " jefe" : ""}${nivel.numero === this.elegido ? " elegido" : ""}`;
        boton.dataset.estrellas = String(estrellas);
        boton.disabled = !abierto;
        boton.setAttribute("aria-pressed", String(nivel.numero === this.elegido));
        const etiqueta = !abierto ? "bloqueado" : estrellas > 0 ? (estrellas === 1 ? "1 estrella" : `${estrellas} estrellas`) : "sin completar";
        boton.setAttribute("aria-label", `Nivel ${nivel.numero}${nivel.jefe ? " (jefe)" : ""}: ${etiqueta}`);
        const numero = document.createElement("span");
        numero.className = "numero";
        numero.textContent = String(nivel.numero);
        boton.append(numero);
        if (!abierto) boton.append(candado());
        boton.addEventListener("click", () => {
          this.elegido = nivel.numero;
          this.pintar();
          porId("ficha-nivel").scrollIntoView({ block: "nearest" });
        });
        fila.append(boton);
        if (abierto) {
          const caja = document.createElement("span");
          caja.className = "estrellas";
          pintarEstrellas(caja, estrellas);
          fila.append(caja);
        }
        if (nivel.numero === ultimo && estrellas === 0) fila.classList.add("aqui");
        return fila;
      }),
    );
    porId("mapa-sendero").dataset.hasta = String(ultimo);
    const hecho = porId("mapa-sendero").querySelector("path.hecho");
    hecho?.setAttribute("d", rutaSendero(NIVELES.length, ultimo));
    this.pintarFicha(p);
  }

  private pintarFicha(p: Progreso): void {
    const nivel = nivelPorNumero(this.elegido) ?? NIVELES[0]!;
    const estrellas = estrellasGuardadas(p, nivel.numero);
    porId("ficha-nivel-titulo").textContent = `Nivel ${nivel.numero}${nivel.jefe ? " · Jefe" : ""}`;
    porId("ficha-nivel-objetivo").textContent = textoObjetivo(nivel);
    pintarEstrellas(porId("ficha-nivel-estrellas"), estrellas);
    porId("ficha-nivel-detalle").textContent = estrellas >= ESTRELLAS_POR_NIVEL ? "Completado con 3 estrellas" : `2 estrellas: ${formatearNumero(nivel.p2)} puntos · 3: ${formatearNumero(nivel.p3)}`;
    const jugar = porId<HTMLButtonElement>("ficha-nivel-jugar");
    jugar.textContent = estrellas > 0 ? `Repetir el nivel ${nivel.numero}` : `Jugar el nivel ${nivel.numero}`;
    jugar.disabled = !nivelDisponible(p, nivel.numero);
  }
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
