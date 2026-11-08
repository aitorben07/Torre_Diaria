// Pantalla Colección (C3): dos pestañas (Piezas y Escenarios), cada artículo
// con su muestra dibujada, su estado y un botón. Comprar un tema lo pone en
// uso al momento. Los escenarios no se compran: se desbloquean por altura o racha.
// Todo el DOM se crea con `createElement` y `textContent`.
import { desbloqueado, ESCENARIOS, equipado, loTiene, TEMAS, type Articulo } from "../logica/catalogo.ts";
import type { Progreso } from "../logica/progreso.ts";
import { formatearNumero } from "../logica/tarjeta.ts";
import { pintarMuestra } from "./muestras.ts";
import { escenarioPorId, temaPorId } from "./temas.ts";

export type EstadoArticulo = "equipado" | "tuyo" | "precio" | "bloqueado";

/** Estado de un artículo y el texto que lo explica. */
export function estadoArticulo(p: Progreso, a: Articulo): { estado: EstadoArticulo; texto: string } {
  const puesto = equipado(p);
  if (a.tipo === "tema") {
    if (puesto.tema === a.id) return { estado: "equipado", texto: "" };
    if (loTiene(p, a.id)) return { estado: "tuyo", texto: "Tuyo" };
    const falta = a.precio - p.monedas;
    return { estado: "precio", texto: falta > 0 ? `Te faltan ${formatearNumero(falta)}` : "Ya puedes comprarlo" };
  }
  if (a.tipo === "escenario") {
    if (puesto.escenario === a.id) return { estado: "equipado", texto: "" };
    if (desbloqueado(p, a)) return { estado: "tuyo", texto: "Desbloqueado" };
    return { estado: "bloqueado", texto: `Llega a ${a.altura} m o racha de ${a.racha}` };
  }
  return { estado: "precio", texto: "" };
}

const SVG = "http://www.w3.org/2000/svg";

/** Moneda dibujada (G11): dos círculos en SVG. */
export function iconoMoneda(): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("moneda");
  for (const [r, clase] of [
    ["9", ""],
    ["5.5", "canto"],
  ] as const) {
    const circulo = document.createElementNS(SVG, "circle");
    circulo.setAttribute("cx", "12");
    circulo.setAttribute("cy", "12");
    circulo.setAttribute("r", r);
    if (clase) circulo.classList.add(clase);
    svg.append(circulo);
  }
  return svg;
}

function nodo<K extends keyof HTMLElementTagNameMap>(etiqueta: K, clase: string, texto?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export type AccionesColeccion = { comprar(id: string): void; equipar(id: string): void };

export class PanelColeccion {
  private pestana: "tema" | "escenario" = "tema";

  constructor(
    private readonly acciones: AccionesColeccion,
    private readonly ultimo: () => Progreso,
  ) {
    for (const [id, pestana] of [
      ["pestana-piezas", "tema"],
      ["pestana-escenarios", "escenario"],
    ] as const) {
      document.getElementById(id)!.addEventListener("click", () => {
        this.pestana = pestana;
        this.pintar(this.ultimo());
      });
    }
  }

  /** Pinta la pestaña elegida con el progreso `p`. El panel tiene que estar visible (las muestras miden su caja). */
  pintar(p: Progreso): void {
    document.getElementById("coleccion-monedas")!.textContent = formatearNumero(p.monedas);
    document.getElementById("pestana-piezas")!.setAttribute("aria-selected", String(this.pestana === "tema"));
    document.getElementById("pestana-escenarios")!.setAttribute("aria-selected", String(this.pestana === "escenario"));
    const lista = document.getElementById("articulos")!;
    const articulos: readonly Articulo[] = this.pestana === "tema" ? TEMAS : ESCENARIOS;
    const puesto = equipado(p);
    const muestras: Array<() => void> = [];
    lista.replaceChildren(
      ...articulos.map((a) => {
        const { estado, texto } = estadoArticulo(p, a);
        const item = nodo("li", `articulo ${estado}`);
        item.dataset.articulo = a.id;
        item.dataset.estadoArticulo = estado;
        const muestra = nodo("canvas", "muestra");
        muestra.setAttribute("aria-hidden", "true");
        const tema = temaPorId(a.tipo === "tema" ? a.id : puesto.tema);
        const escenario = escenarioPorId(a.tipo === "escenario" ? a.id : puesto.escenario);
        muestras.push(() => pintarMuestra(muestra, tema, escenario));
        const boton = nodo("button", estado === "equipado" ? "puesto" : estado === "precio" && a.tipo === "tema" && p.monedas >= a.precio ? "principal" : "");
        boton.type = "button";
        boton.id = `articulo-${a.id}`;
        if (estado === "equipado") {
          boton.textContent = "En uso";
          boton.disabled = true;
        } else if (estado === "tuyo") {
          boton.textContent = "Usar";
          boton.setAttribute("aria-label", `Usar ${a.nombre}`);
          boton.addEventListener("click", () => this.acciones.equipar(a.id));
        } else if (estado === "bloqueado") {
          boton.textContent = "Bloqueado";
          boton.disabled = true;
        } else if (a.tipo === "tema") {
          boton.append(iconoMoneda(), document.createTextNode(formatearNumero(a.precio)));
          boton.setAttribute("aria-label", `Comprar ${a.nombre} por ${formatearNumero(a.precio)} monedas`);
          boton.disabled = p.monedas < a.precio;
          boton.addEventListener("click", () => this.acciones.comprar(a.id));
        }
        item.append(muestra, nodo("p", "nombre", a.nombre), nodo("p", "estado", texto), boton);
        return item;
      }),
    );
    for (const pintar of muestras) pintar();
  }
}
