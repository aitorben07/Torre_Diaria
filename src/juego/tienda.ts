// Tienda (J1, Anexo I con impacto §5; antes Colección, C3): pestañas Objetos
// (la que se ve al abrir), Piezas y Escenarios. Monedas solo existirá con un
// proveedor de pagos o vídeos (R12, bloque K); en la web no se pinta. Cada
// objeto con su dibujo, qué hace, «Tienes N», precio y botón; cada tema o
// escenario, con su muestra dibujada, su estado y un botón. Comprar un tema
// lo pone en uso al momento. Los escenarios no se compran: se desbloquean por
// altura o racha. Las pestañas responden a Tab y a las flechas.
// Todo el DOM se crea con `createElement` y `textContent`.
import { CONGELADOR, desbloqueado, ESCENARIOS, equipado, loTiene, TEMAS, type Articulo } from "../logica/catalogo.ts";
import { CATALOGO_OBJETOS, estaDesbloqueado, MAX_OBJETO, sePuedeComprar, type Objeto } from "../logica/objetos.ts";
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

/** Trazados de cada objeto, con su clase (los colores, en estilos.css). Reloj y cemento, como en la barra. */
const DIBUJOS: Record<Objeto | "congelador", ReadonlyArray<[string, string]>> = {
  reloj: [
    ["marco", "M6 3h12M6 21h12"],
    ["vidrio", "M7.5 3.5c0 4.5 4.5 6 4.5 8.5s-4.5 4-4.5 8.5h9c0-4.5-4.5-6-4.5-8.5s4.5-4 4.5-8.5z"],
    ["arena", "M9.5 19.5c.5-2 2.5-3 2.5-4.5 0 1.5 2 2.5 2.5 4.5z"],
  ],
  cemento: [
    ["saco", "M5 7.5 7 4h10l2 3.5-1 12.5H6z"],
    ["cinta", "M6.2 9h11.6M6.6 16h10.8"],
  ],
  corazon: [["corazon", "M12 20.5S3.5 15 3.5 9.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.5 2.2C20.5 15 12 20.5 12 20.5z"]],
  congelador: [
    ["hielo", "M5 5h14v14H5z"],
    ["copo", "M12 7.5v9M8.1 9.75l7.8 4.5M8.1 14.25l7.8-4.5"],
  ],
};

/** Dibujo de un objeto de la tienda, en SVG (sin imágenes, R11). */
export function iconoObjeto(id: Objeto | "congelador"): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("muestra", "objeto-dibujo", id);
  for (const [clase, d] of DIBUJOS[id]) {
    const ruta = document.createElementNS(SVG, "path");
    ruta.setAttribute("d", d);
    ruta.classList.add(clase);
    svg.append(ruta);
  }
  return svg;
}

function nodo<K extends keyof HTMLElementTagNameMap>(etiqueta: K, clase: string, texto?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export type AccionesTienda = { comprar(id: string): void; equipar(id: string): void; comprarObjeto(id: Objeto): void };

export type Pestana = "objeto" | "tema" | "escenario";

/** Pestañas en orden, con el id de su botón. */
const PESTANAS: ReadonlyArray<[Pestana, string]> = [
  ["objeto", "pestana-objetos"],
  ["tema", "pestana-piezas"],
  ["escenario", "pestana-escenarios"],
];

/** Botón de comprar con la moneda dibujada y el precio. */
function botonPrecio(nombre: string, precio: number, puede: boolean): HTMLButtonElement {
  const boton = nodo("button", puede ? "principal" : "");
  boton.type = "button";
  boton.append(iconoMoneda(), document.createTextNode(formatearNumero(precio)));
  boton.setAttribute("aria-label", `Comprar ${nombre} por ${formatearNumero(precio)} monedas`);
  boton.disabled = !puede;
  return boton;
}

export class PanelTienda {
  private pestana: Pestana = "objeto";

  constructor(
    private readonly acciones: AccionesTienda,
    private readonly ultimo: () => Progreso,
  ) {
    for (const [pestana, id] of PESTANAS) {
      const boton = document.getElementById(id)!;
      boton.addEventListener("click", () => this.elegir(pestana));
      // Flechas, Inicio y Fin cambian de pestaña y llevan el foco a la nueva (patrón de pestañas de WAI-ARIA).
      boton.addEventListener("keydown", (evento) => {
        const i = PESTANAS.findIndex(([p]) => p === pestana);
        const destino =
          evento.key === "ArrowRight" ? (i + 1) % PESTANAS.length
          : evento.key === "ArrowLeft" ? (i + PESTANAS.length - 1) % PESTANAS.length
          : evento.key === "Home" ? 0
          : evento.key === "End" ? PESTANAS.length - 1
          : -1;
        if (destino < 0) return;
        evento.preventDefault();
        const [nueva, idNueva] = PESTANAS[destino]!;
        this.elegir(nueva);
        document.getElementById(idNueva)!.focus();
      });
    }
  }

  /** Al abrir, la pestaña Objetos (impacto, J1: nunca Monedas). */
  abrir(p: Progreso): void {
    this.pestana = "objeto";
    this.pintar(p);
  }

  private elegir(pestana: Pestana): void {
    this.pestana = pestana;
    this.pintar(this.ultimo());
  }

  /** Pinta la pestaña elegida con el progreso `p`. El panel tiene que estar visible (las muestras miden su caja). */
  pintar(p: Progreso): void {
    document.getElementById("tienda-monedas")!.textContent = formatearNumero(p.monedas);
    for (const [pestana, id] of PESTANAS) document.getElementById(id)!.setAttribute("aria-selected", String(this.pestana === pestana));
    const lista = document.getElementById("articulos")!;
    lista.dataset.pestana = this.pestana;
    if (this.pestana === "objeto") {
      lista.replaceChildren(...this.objetos(p));
      return;
    }
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
        let boton: HTMLButtonElement;
        if (estado === "precio" && a.tipo === "tema") {
          boton = botonPrecio(a.nombre, a.precio, p.monedas >= a.precio);
          boton.addEventListener("click", () => this.acciones.comprar(a.id));
        } else {
          boton = nodo("button", estado === "equipado" ? "puesto" : "");
          boton.type = "button";
          if (estado === "equipado") {
            boton.textContent = "En uso";
            boton.disabled = true;
          } else if (estado === "tuyo") {
            boton.textContent = "Usar";
            boton.setAttribute("aria-label", `Usar ${a.nombre}`);
            boton.addEventListener("click", () => this.acciones.equipar(a.id));
          } else {
            boton.textContent = "Bloqueado";
            boton.disabled = true;
          }
        }
        boton.id = `articulo-${a.id}`;
        item.append(muestra, nodo("p", "nombre", a.nombre), nodo("p", "estado", texto), boton);
        return item;
      }),
    );
    for (const pintar of muestras) pintar();
  }

  /** Pestaña Objetos: reloj, cemento y corazón (los bloqueados dicen cuándo llegan) y el congelador de racha. */
  private objetos(p: Progreso): HTMLLIElement[] {
    const filas = CATALOGO_OBJETOS.map((o) => {
      const abierto = estaDesbloqueado(p, o.id);
      const lleno = p.objetos[o.id] >= MAX_OBJETO;
      const estado = !abierto ? `Tras ${o.partidas} partidas` : lleno ? `Tienes ${MAX_OBJETO}, el máximo` : `Tienes ${p.objetos[o.id]}`;
      const boton = botonPrecio(o.nombre, o.precio, sePuedeComprar(p, o.id));
      boton.id = `objeto-comprar-${o.id}`;
      boton.addEventListener("click", () => this.acciones.comprarObjeto(o.id));
      return this.filaObjeto(o.id, o.nombre, o.texto, estado, p.objetos[o.id], abierto, boton);
    });
    const congeladores = p.racha.congeladores;
    const lleno = congeladores >= CONGELADOR.maximo;
    const boton = botonPrecio(CONGELADOR.nombre, CONGELADOR.precio, !lleno && p.monedas >= CONGELADOR.precio);
    boton.id = "objeto-comprar-congelador";
    boton.addEventListener("click", () => this.acciones.comprar(CONGELADOR.id));
    const texto = "Si un día no juegas el reto, la racha sigue";
    const estado = lleno ? `Tienes ${CONGELADOR.maximo}, el máximo` : `Tienes ${congeladores}`;
    return [...filas, this.filaObjeto("congelador", CONGELADOR.nombre, texto, estado, congeladores, true, boton)];
  }

  private filaObjeto(id: Objeto | "congelador", nombre: string, texto: string, estado: string, tienes: number, abierto: boolean, boton: HTMLButtonElement): HTMLLIElement {
    const item = nodo("li", `articulo objeto-tienda${abierto ? "" : " bloqueado"}`);
    item.dataset.articulo = id;
    item.dataset.tienes = String(tienes);
    item.append(iconoObjeto(id), nodo("p", "nombre", nombre), nodo("p", "que-hace", texto), nodo("p", "estado", estado), boton);
    return item;
  }
}
