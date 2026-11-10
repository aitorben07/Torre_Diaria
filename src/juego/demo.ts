// Compilación de demostración (K3, Decisión T21): pagos y vídeos simulados
// con una capa en pantalla, y una banda fija que lo dice. Solo se usa con
// `astro build --mode demo`: `principal.ts` lo elige con
// `import.meta.env.MODE === "demo"` en el nivel superior, así la compilación
// web lo descarta entero y sus textos no llegan a `dist/` (R14). No se cobra
// nada ni se ve ningún vídeo de verdad. DOM con `createElement` y `textContent`.
import { textoEuros } from "../logica/tienda.ts";
import { anunciosSimulados, type Anuncios, type ResultadoRecompensado } from "./anuncios.ts";
import { pagosSimulados, type Pagos } from "./pagos.ts";

/** Lo que dura el vídeo de prueba. */
export const VIDEO_PRUEBA_MS = 3000;

function nodo<K extends keyof HTMLElementTagNameMap>(etiqueta: K, clase: string, texto?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/**
 * Capa modal sobre el juego con un título, un texto y botones. Resuelve con el
 * valor del botón pulsado (o con el que pase `cerrar`) y devuelve el foco a
 * donde estaba.
 */
function capa<T>(id: string, titulo: string, texto: string, botones: ReadonlyArray<[string, T]>): { texto: HTMLParagraphElement; cerrar(valor: T): void; hecho: Promise<T> } {
  const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const fondo = nodo("div", "capa-demo");
  const caja = nodo("section", "panel-demo");
  caja.id = id;
  caja.setAttribute("role", "dialog");
  caja.setAttribute("aria-modal", "true");
  caja.setAttribute("aria-labelledby", `${id}-titulo`);
  const h2 = nodo("h2", "", titulo);
  h2.id = `${id}-titulo`;
  const parrafo = nodo("p", "", texto);
  const acciones = nodo("div", "acciones");
  let resolver: (valor: T) => void = () => {};
  const hecho = new Promise<T>((r) => (resolver = r));
  let abierta = true;
  const cerrar = (valor: T) => {
    if (!abierta) return;
    abierta = false;
    fondo.remove();
    if (anterior?.isConnected) anterior.focus();
    resolver(valor);
  };
  for (const [etiqueta, valor] of botones) {
    const boton = nodo("button", acciones.childElementCount === 0 ? "principal" : "", etiqueta);
    boton.type = "button";
    boton.addEventListener("click", () => cerrar(valor));
    acciones.append(boton);
  }
  caja.append(h2, parrafo, acciones);
  fondo.append(caja);
  document.body.append(fondo);
  (acciones.firstElementChild as HTMLButtonElement | null)?.focus();
  return { texto: parrafo, cerrar, hecho };
}

/** Vídeo de prueba: 3 s con su cuenta atrás. «Cerrar» antes de tiempo lo cancela; al acabar, «visto». */
function videoDePrueba(): Promise<ResultadoRecompensado> {
  const { texto, cerrar, hecho } = capa<ResultadoRecompensado>("video-prueba", "Vídeo de prueba", "", [["Cerrar", "cancelado"]]);
  let quedan = Math.ceil(VIDEO_PRUEBA_MS / 1000);
  const contar = () => (texto.textContent = `Aquí iría un vídeo con premio. Termina en ${quedan} s.`);
  contar();
  const reloj = setInterval(() => {
    quedan--;
    if (quedan > 0) contar();
    else cerrar("visto");
  }, 1000);
  return hecho.finally(() => clearInterval(reloj));
}

export function anunciosDemo(): Anuncios {
  return anunciosSimulados(() => videoDePrueba());
}

export function pagosDemo(): Pagos {
  return pagosSimulados(
    (producto) =>
      capa("pago-simulado", "Pago simulado", `${producto.texto} por ${textoEuros(producto.centimos)}. No se cobra nada.`, [
        ["Pagar", "pagado" as const],
        ["Cancelar", "cancelado" as const],
      ]).hecho,
  );
}

/** Banda fija arriba: que nadie confunda la demostración con la web. */
export function ponerBandaDemo(): void {
  const banda = nodo("p", "banda-demo", "Demostración: no se cobra nada y los vídeos son de prueba");
  banda.id = "banda-demo";
  banda.setAttribute("role", "note");
  document.body.prepend(banda);
}
