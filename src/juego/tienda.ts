// Tienda (J1, Anexo I con impacto §5; antes Colección, C3): pestañas Objetos
// (la que se ve al abrir), Piezas, Escenarios y Monedas, que solo aparece con
// un proveedor de pagos o de vídeos (R12, K1, K2); en la web no se ve. Con
// pagos, cada precio en monedas lleva su «≈ X,XX €» y, con vídeos, cada objeto
// su «Gratis con vídeo» (uno al día). Cada
// objeto con su dibujo, qué hace, «Tienes N», precio y botón; cada tema o
// escenario, con su muestra dibujada, su estado y un botón. Comprar un tema
// lo pone en uso al momento. Los escenarios no se compran: se desbloquean por
// altura o racha. Las pestañas responden a Tab y a las flechas.
// Todo el DOM se crea con `createElement` y `textContent`.
import { CONGELADOR, desbloqueado, ESCENARIOS, equipado, loTiene, TEMAS, type Articulo } from "../logica/catalogo.ts";
import { CATALOGO_OBJETOS, estaDesbloqueado, MAX_OBJETO, sePuedeComprar, type Objeto } from "../logica/objetos.ts";
import type { Progreso } from "../logica/progreso.ts";
import { esperaVideoMonedas, HORAS_VIDEO, MONEDAS_VIDEO, objetoVideoDisponible, textoEspera } from "../logica/recompensas.ts";
import { centimosPorMoneda, productoDisponible, textoEuros, UNIDADES_PACK } from "../logica/tienda.ts";
import type { ProductoPago } from "./pagos.ts";
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

export type AccionesTienda = {
  comprar(id: string): void;
  equipar(id: string): void;
  comprarObjeto(id: Objeto): void;
  /** Vídeo con premio de monedas (K2). */
  verVideoMonedas(): void;
  /** Vídeo con premio de un objeto (K2). */
  verVideoObjeto(id: Objeto): void;
  /** Compra con dinero (K1). */
  pagar(id: ProductoPago["id"]): void;
};

/**
 * Lo que ofrecen los proveedores en este momento: productos de dinero (vacío
 * sin pagos), si hay vídeo con premio y la hora para su política (K2).
 */
export type Ofertas = { productos: readonly ProductoPago[]; video: boolean; ahora: number };

export type Pestana = "objeto" | "tema" | "escenario" | "moneda";

/** Pestañas en orden, con el id de su botón. */
const PESTANAS: ReadonlyArray<[Pestana, string]> = [
  ["objeto", "pestana-objetos"],
  ["tema", "pestana-piezas"],
  ["escenario", "pestana-escenarios"],
  ["moneda", "pestana-monedas"],
];

/** ¿Hay algo que enseñar en Monedas? Sin proveedor, la pestaña no existe (R12). */
export function hayMonedas(ofertas: Ofertas): boolean {
  return ofertas.productos.length > 0 || ofertas.video;
}

/** «≈ X,XX €» bajo un precio en monedas, solo con pagos (impacto, J1); sin ellos, nada. */
function equivalente(precio: number, ofertas: Ofertas): HTMLParagraphElement[] {
  const porMoneda = centimosPorMoneda(ofertas.productos);
  return porMoneda === null ? [] : [nodo("p", "equivalente", `≈ ${textoEuros(precio * porMoneda)}`)];
}

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
    private readonly ofertas: () => Ofertas,
  ) {
    for (const [pestana, id] of PESTANAS) {
      const boton = document.getElementById(id)!;
      boton.addEventListener("click", () => this.elegir(pestana));
      // Flechas, Inicio y Fin cambian de pestaña y llevan el foco a la nueva (patrón de pestañas de WAI-ARIA).
      boton.addEventListener("keydown", (evento) => {
        // Solo las pestañas que se ven: sin proveedor, Monedas no está.
        const visibles = PESTANAS.filter(([, idVisible]) => !document.getElementById(idVisible)!.hidden);
        const i = visibles.findIndex(([p]) => p === pestana);
        const destino =
          evento.key === "ArrowRight" ? (i + 1) % visibles.length
          : evento.key === "ArrowLeft" ? (i + visibles.length - 1) % visibles.length
          : evento.key === "Home" ? 0
          : evento.key === "End" ? visibles.length - 1
          : -1;
        if (destino < 0) return;
        evento.preventDefault();
        const [nueva, idNueva] = visibles[destino]!;
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
    const ofertas = this.ofertas();
    const conMonedas = hayMonedas(ofertas);
    document.getElementById("pestana-monedas")!.hidden = !conMonedas;
    if (this.pestana === "moneda" && !conMonedas) this.pestana = "objeto";
    document.getElementById("tienda-monedas")!.textContent = formatearNumero(p.monedas);
    for (const [pestana, id] of PESTANAS) document.getElementById(id)!.setAttribute("aria-selected", String(this.pestana === pestana));
    const lista = document.getElementById("articulos")!;
    lista.dataset.pestana = this.pestana;
    if (this.pestana === "objeto") {
      lista.replaceChildren(...this.objetos(p, ofertas));
      return;
    }
    if (this.pestana === "moneda") {
      lista.replaceChildren(...this.monedas(p, ofertas));
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
        const euros = estado === "precio" && a.tipo === "tema" ? equivalente(a.precio, ofertas) : [];
        item.append(muestra, nodo("p", "nombre", a.nombre), nodo("p", "estado", texto), ...euros, boton);
        return item;
      }),
    );
    for (const pintar of muestras) pintar();
  }

  /** Pestaña Objetos: reloj, cemento y corazón (los bloqueados dicen cuándo llegan) y el congelador de racha. */
  private objetos(p: Progreso, ofertas: Ofertas): HTMLLIElement[] {
    const filas = CATALOGO_OBJETOS.map((o) => {
      const abierto = estaDesbloqueado(p, o.id);
      const lleno = p.objetos[o.id] >= MAX_OBJETO;
      const estado = !abierto ? `Tras ${o.partidas} partidas` : lleno ? `Tienes ${MAX_OBJETO}, el máximo` : `Tienes ${p.objetos[o.id]}`;
      const boton = botonPrecio(o.nombre, o.precio, sePuedeComprar(p, o.id));
      boton.id = `objeto-comprar-${o.id}`;
      boton.addEventListener("click", () => this.acciones.comprarObjeto(o.id));
      let video: HTMLButtonElement | null = null;
      // Con vídeo: uno gratis al día (K2). Se ofrece en cada objeto que aún cabe.
      if (ofertas.video && objetoVideoDisponible(p, ofertas.ahora, o.id)) {
        video = nodo("button", "video", "Gratis con vídeo");
        video.type = "button";
        video.id = `objeto-video-${o.id}`;
        video.setAttribute("aria-label", `${o.nombre} gratis con vídeo`);
        video.addEventListener("click", () => this.acciones.verVideoObjeto(o.id));
      }
      return this.filaObjeto(o.id, o.nombre, o.texto, estado, p.objetos[o.id], abierto, boton, equivalente(o.precio, ofertas), video);
    });
    const congeladores = p.racha.congeladores;
    const lleno = congeladores >= CONGELADOR.maximo;
    const boton = botonPrecio(CONGELADOR.nombre, CONGELADOR.precio, !lleno && p.monedas >= CONGELADOR.precio);
    boton.id = "objeto-comprar-congelador";
    boton.addEventListener("click", () => this.acciones.comprar(CONGELADOR.id));
    const texto = "Si un día no juegas el reto, la racha sigue";
    const estado = lleno ? `Tienes ${CONGELADOR.maximo}, el máximo` : `Tienes ${congeladores}`;
    return [...filas, this.filaObjeto("congelador", CONGELADOR.nombre, texto, estado, congeladores, true, boton, equivalente(CONGELADOR.precio, ofertas), null)];
  }

  private filaObjeto(
    id: Objeto | "congelador",
    nombre: string,
    texto: string,
    estado: string,
    tienes: number,
    abierto: boolean,
    boton: HTMLButtonElement,
    euros: HTMLParagraphElement[],
    video: HTMLButtonElement | null,
  ): HTMLLIElement {
    const item = nodo("li", `articulo objeto-tienda${abierto ? "" : " bloqueado"}`);
    item.dataset.articulo = id;
    item.dataset.tienes = String(tienes);
    item.append(iconoObjeto(id), nodo("p", "nombre", nombre), nodo("p", "que-hace", texto), nodo("p", "estado", estado), ...euros, boton);
    if (video) item.append(video);
    return item;
  }

  /**
   * Pestaña Monedas (K1, K2): el vídeo de monedas, con su espera si aún no
   * toca, y los productos del proveedor con su precio en euros. El pack solo
   * se ofrece si con él ningún objeto pasa del máximo. Sin imperativos ni
   * ofertas que caducan (impacto, J1 y K1).
   */
  private monedas(p: Progreso, ofertas: Ofertas): HTMLLIElement[] {
    const filas: HTMLLIElement[] = [];
    if (ofertas.video) {
      const espera = esperaVideoMonedas(p, ofertas.ahora);
      const boton = nodo("button", espera === 0 ? "principal" : "", "Ver vídeo");
      boton.type = "button";
      boton.id = "video-monedas";
      boton.disabled = espera > 0;
      boton.setAttribute("aria-label", `Ver vídeo por ${MONEDAS_VIDEO} monedas`);
      boton.addEventListener("click", () => this.acciones.verVideoMonedas());
      const item = nodo("li", "articulo producto");
      item.dataset.articulo = "video-monedas";
      item.append(nodo("p", "nombre", `${MONEDAS_VIDEO} monedas con un vídeo`), nodo("p", "estado", espera === 0 ? `Uno cada ${HORAS_VIDEO} h` : textoEspera(espera)), boton);
      filas.push(item);
    }
    for (const producto of ofertas.productos) {
      const cabe = productoDisponible(p, producto.id);
      const precio = textoEuros(producto.centimos);
      const boton = nodo("button", "", precio);
      boton.type = "button";
      boton.id = `producto-${producto.id}`;
      boton.disabled = !cabe;
      boton.setAttribute("aria-label", `Comprar ${producto.texto} por ${precio}`);
      boton.addEventListener("click", () => this.acciones.pagar(producto.id));
      const item = nodo("li", "articulo producto");
      item.dataset.articulo = producto.id;
      const estado = cabe ? "" : `Con él pasarías de ${MAX_OBJETO} de algún objeto (da ${UNIDADES_PACK} de cada)`;
      item.append(nodo("p", "nombre", producto.texto), nodo("p", "estado", estado), boton);
      filas.push(item);
    }
    return filas;
  }
}
