// Punto de entrada de la página: une la simulación, el dibujo, la entrada de
// un toque y las pantallas. Las transiciones entre pantallas las decide
// `flujo.ts`; aquí solo se conectan con el DOM (B5).
import { leerReto } from "../logica/reto.ts";
import {
  almacenDelNavegador,
  guardarRegistroLibre,
  guardarResultado,
  leerRegistroLibre,
  leerResultado,
  type ResultadoDia,
} from "../logica/registro.ts";
import { VIDAS_INICIALES, VIDAS_MAX } from "../logica/puntuacion.ts";
import { fechaDeDia, fechaUTC, numeroDia, semillaLibre } from "../logica/semilla.ts";
import { Partida, type OpcionesPartida } from "../logica/simulacion.ts";
import { formatearAltura, formatearPuntos, generarTarjeta } from "../logica/tarjeta.ts";
import { Bucle } from "./bucle.ts";
import { Lienzo } from "./dibujo.ts";
import { abrir, transicion, type Accion, type Flujo, type Modo, type Orden } from "./flujo.ts";
import { cambiarEstado, compartir, copiar, pintarFin, pintarHud, pintarReto, ui } from "./pantallas.ts";

/** Opciones de toda partida de esta página; van en `data-opciones` para reproducirla con `jugar` (G3). */
const OPCIONES: OpcionesPartida = { vidas: VIDAS_INICIALES };

/** Día de hoy en UTC. Se recalcula al empezar el reto de hoy y al volver a la pestaña. */
let hoy = numeroDia(fechaUTC(new Date()));
const almacen = almacenDelNavegador();
const reto = leerReto(location.search, hoy);
let registroLibre = leerRegistroLibre(almacen);

const lienzo = new Lienzo(ui.lienzo());
let partida: Partida | null = null;
/** Partida que se dibuja: sigue en pantalla, quieta, tras acabar. */
let escena: Partida | null = null;
let flujo: Flujo;
let pendiente = false;
let toques: number[] = [];
let textoTarjeta = "";
let hudPintado = "";

/** Recalcula `hoy`, por si ha pasado la medianoche UTC. Devuelve si ha cambiado. */
function actualizarHoy(): boolean {
  const ahora = numeroDia(fechaUTC(new Date()));
  if (ahora === hoy) return false;
  hoy = ahora;
  return true;
}

function resultadoHoy(): ResultadoDia | null {
  return leerResultado(almacen, hoy);
}

/** Aplica una acción de la interfaz: el flujo decide y aquí se ejecuta la orden. */
function actuar(accion: Accion): void {
  if (accion.tipo !== "terminar") actualizarHoy();
  const siguiente = transicion(flujo, accion, { ahora: performance.now(), hoy, jugadoHoy: resultadoHoy() !== null });
  flujo = siguiente.flujo;
  ejecutar(siguiente.orden);
}

function ejecutar(orden: Orden): void {
  if (orden.tipo === "jugar") empezar(orden.modo, orden.dia);
  else if (orden.tipo === "resultado") verGuardado();
  else if (orden.tipo === "reto") mostrarReto();
}

function mostrarReto(): void {
  if (!reto) return;
  partida = null;
  escena = null;
  pintarReto({ hoy, reto, puntosHoy: resultadoHoy()?.puntos ?? null });
  pintarHud({ puntos: 0, vidas: VIDAS_INICIALES, vidasMax: VIDAS_MAX, combo: 0, record: null });
  cambiarEstado("reto");
  actualizarBotonHoy();
  lienzo.reservarArriba(0);
}

function verGuardado(): void {
  const guardado = resultadoHoy();
  if (!guardado) return;
  partida = null;
  escena = null;
  ui.juego().dataset.modo = "oficial";
  mostrarFin(guardado, "oficial");
}

/** «Reto de hoy» se ve siempre salvo mientras se juega un reto diario. */
function actualizarBotonHoy(): void {
  ui.botonHoy().hidden = flujo.pantalla === "jugando" && flujo.modo !== "libre";
}

function empezar(modo: Modo, dia: number): void {
  const semilla = modo === "libre" ? semillaLibre() : fechaDeDia(dia);
  partida = new Partida(semilla, OPCIONES);
  escena = partida;
  pendiente = false;
  toques = [];
  const juego = ui.juego();
  juego.dataset.modo = modo;
  juego.dataset.semilla = semilla;
  juego.dataset.opciones = JSON.stringify(OPCIONES);
  juego.dataset.fase = partida.fase;
  delete juego.dataset.toques;
  delete juego.dataset.puntos;
  delete juego.dataset.altura;
  ui.avisoToque().hidden = registroLibre.tutorialVisto;
  lienzo.reiniciarCamara();
  lienzo.reservarArriba(0);
  bucle.reiniciar();
  (document.activeElement as HTMLElement | null)?.blur();
  cambiarEstado("jugando");
  actualizarBotonHoy();
  actualizarHud();
}

/** Puntos del amigo si la partida (o el resultado) responde a su reto. */
function puntosAmigo(modoPartida: Modo, diaPartida: number): number | null {
  if (!reto || modoPartida === "libre" || reto.dia !== diaPartida) return null;
  return reto.puntos;
}

function mostrarFin(datos: ResultadoDia, modoPartida: Modo): void {
  const libre = modoPartida === "libre";
  textoTarjeta = generarTarjeta({
    modo: libre ? "libre" : "diario",
    dia: datos.dia,
    puntos: datos.puntos,
    altura: datos.altura,
    formas: datos.formas,
    origen: location.origin,
  });
  pintarFin({
    titulo: libre ? "Partida libre" : `Reto del día #${datos.dia}`,
    puntos: datos.puntos,
    altura: datos.altura,
    tarjeta: textoTarjeta,
    record: libre ? registroLibre.record : null,
    puntosAmigo: puntosAmigo(modoPartida, datos.dia),
    principal: libre ? "Otra vez" : "Partida libre",
  });
  const juego = ui.juego();
  juego.dataset.puntos = String(datos.puntos);
  juego.dataset.altura = String(datos.altura);
  cambiarEstado("fin");
  actualizarBotonHoy();
  reservarTarjeta();
}

/** Lo que tapa la tarjeta de fin por arriba, para que la cámara deje la cima debajo. */
function reservarTarjeta(): void {
  const zona = ui.zona().getBoundingClientRect();
  lienzo.reservarArriba(ui.fin().getBoundingClientRect().bottom - zona.top);
}

function terminar(actual: Partida): void {
  const { puntos, altura, formas } = actual.resultado();
  const { modo, dia } = flujo;
  const datos: ResultadoDia = { dia, puntos, altura, formas };
  // Con dos pestañas a la vez vale la primera oficial que acaba (D4).
  if (modo === "oficial" && leerResultado(almacen, dia) === null) guardarResultado(almacen, datos);
  if (modo === "libre" && puntos > registroLibre.record) {
    registroLibre = { ...registroLibre, record: puntos };
    guardarRegistroLibre(almacen, registroLibre);
  }
  ui.juego().dataset.toques = JSON.stringify(toques);
  partida = null;
  actuar({ tipo: "terminar" });
  ui.contador().textContent = `${formatearPuntos(puntos)} · ${formatearAltura(altura)}`;
  hudPintado = "";
  mostrarFin(datos, modo);
}

function actualizarHud(): void {
  if (!partida) return;
  const { puntos, vidas, combo } = partida.estado();
  const record = flujo.modo === "libre" ? registroLibre.record : null;
  const clave = `${puntos}|${vidas}|${combo}|${record}`;
  if (clave === hudPintado) return;
  hudPintado = clave;
  pintarHud({ puntos, vidas, vidasMax: VIDAS_MAX, combo, record });
}

/** Aplica los pasos que tocan. Un toque se aplica en el siguiente paso y se anota su número. */
function avanzar(pasos: number): void {
  const actual = partida;
  if (!actual) return;
  for (let i = 0; i < pasos; i++) {
    if (pendiente) {
      pendiente = false;
      const paso = actual.pasos;
      if (actual.soltar()) toques.push(paso);
    }
    actual.paso();
    // Los eventos (B1) los usará la jugosidad del bloque A; de momento se vacían.
    actual.tomarEventos();
    if (actual.terminada) {
      terminar(actual);
      return;
    }
  }
  const juego = ui.juego();
  juego.dataset.fase = actual.fase;
  // Posición de la pieza que cuelga y del objetivo, para que las pruebas toquen sobre la torre.
  const { colgada, objetivo } = actual.estado();
  juego.dataset.x = colgada ? colgada.x.toFixed(2) : "";
  juego.dataset.objetivo = objetivo.toFixed(2);
  actualizarHud();
}

function pedirSoltar(): void {
  if (flujo.pantalla !== "jugando") return;
  pendiente = true;
  if (!registroLibre.tutorialVisto) {
    registroLibre = { ...registroLibre, tutorialVisto: true };
    guardarRegistroLibre(almacen, registroLibre);
    ui.avisoToque().hidden = true;
  }
}

const bucle = new Bucle(avanzar, () => lienzo.dibujar(escena?.estado() ?? null));

/** ¿Tiene el foco un control que ya responde a Espacio e Intro por sí mismo? */
function focoEnControl(): boolean {
  const activo = document.activeElement;
  return activo instanceof HTMLButtonElement || activo instanceof HTMLAnchorElement || activo instanceof HTMLInputElement;
}

ui.zona().addEventListener("pointerdown", (evento) => {
  if (flujo.pantalla !== "jugando") return;
  evento.preventDefault();
  pedirSoltar();
});
document.addEventListener("keydown", (evento) => {
  if (evento.repeat || !(evento.code === "Space" || evento.key === " " || evento.key === "Enter")) return;
  if (flujo.pantalla === "jugando") {
    evento.preventDefault();
    pedirSoltar();
  } else if (flujo.pantalla === "fin" && !focoEnControl()) {
    // En el fin, Espacio o Intro equivalen a «Otra vez» (pasados 700 ms).
    evento.preventDefault();
    actuar({ tipo: "libre" });
  }
});

ui.botonOtraVez().addEventListener("click", () => actuar({ tipo: "libre" }));
ui.botonLibreReto().addEventListener("click", () => actuar({ tipo: "libre" }));
ui.botonHoy().addEventListener("click", () => actuar({ tipo: "retoDeHoy" }));
ui.botonReto().addEventListener("click", () => {
  if (reto) actuar({ tipo: "jugarReto", reto });
});
ui.botonCopiar().addEventListener("click", async () => {
  ui.mensaje().textContent = (await copiar(textoTarjeta)) ? "Copiado" : "No se ha podido copiar: selecciona el texto.";
});
ui.botonCompartir().addEventListener("click", async () => {
  const resultado = await compartir(textoTarjeta);
  ui.mensaje().textContent = resultado === "error" ? "No se ha podido compartir." : "";
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (actualizarHoy() && flujo.pantalla === "reto") mostrarReto();
});
// El lienzo cambia de tamaño con la ventana y también con el HUD (combo, récord):
// se reajusta cada vez que cambia su caja, no solo al redimensionar la ventana.
new ResizeObserver(() => {
  lienzo.ajustar();
  if (flujo.pantalla === "fin") reservarTarjeta();
}).observe(ui.lienzo());
const inicio = abrir(reto, hoy);
flujo = inicio.flujo;
ejecutar(inicio.orden);
lienzo.ajustar();
bucle.iniciar();
