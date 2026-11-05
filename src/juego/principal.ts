// Punto de entrada de la página: une la simulación, el dibujo, la entrada de
// un toque y las pantallas.
import { leerReto } from "../logica/reto.ts";
import { almacenDelNavegador, guardarResultado, leerResultado, type ResultadoDia } from "../logica/registro.ts";
import { fechaDeDia, fechaUTC, numeroDia, semillaPractica } from "../logica/semilla.ts";
import { Partida } from "../logica/simulacion.ts";
import { formatearAltura, formatearPiezas, generarTarjeta } from "../logica/tarjeta.ts";
import { Bucle } from "./bucle.ts";
import { Lienzo } from "./dibujo.ts";
import { cambiarEstado, compartir, copiar, pintarFin, pintarInicio, ui } from "./pantallas.ts";

type Modo = "oficial" | "reto" | "practica";

const hoy = numeroDia(fechaUTC(new Date()));
const almacen = almacenDelNavegador();
const reto = leerReto(location.search, hoy);

const lienzo = new Lienzo(ui.lienzo());
let partida: Partida | null = null;
/** Partida que se dibuja: sigue en pantalla, quieta, tras acabar. */
let escena: Partida | null = null;
let modo: Modo = "oficial";
let dia = hoy;
let pendiente = false;
let toques: number[] = [];
let textoTarjeta = "";
let contadorPintado = "";

function resultadoHoy(): ResultadoDia | null {
  return leerResultado(almacen, hoy);
}

function mostrarInicio(): void {
  partida = null;
  escena = null;
  pintarInicio({ hoy, puntosHoy: resultadoHoy()?.puntos ?? null, reto });
  pintarContador("");
  cambiarEstado("inicio");
}

function empezar(nuevoModo: Modo, nuevoDia: number): void {
  modo = nuevoModo;
  dia = nuevoDia;
  const semilla = modo === "practica" ? semillaPractica() : fechaDeDia(dia);
  partida = new Partida(semilla);
  escena = partida;
  pendiente = false;
  toques = [];
  const juego = ui.juego();
  juego.dataset.modo = modo;
  juego.dataset.semilla = semilla;
  juego.dataset.fase = partida.fase;
  delete juego.dataset.toques;
  delete juego.dataset.puntos;
  delete juego.dataset.altura;
  lienzo.reiniciarCamara();
  bucle.reiniciar();
  (document.activeElement as HTMLElement | null)?.blur();
  cambiarEstado("jugando");
  actualizarContador();
}

/** Puntos del amigo si la partida (o el resultado) responde a su reto. */
function puntosAmigo(modoPartida: Modo, diaPartida: number): number | null {
  if (!reto || modoPartida === "practica" || reto.dia !== diaPartida) return null;
  return reto.puntos;
}

function mostrarFin(datos: ResultadoDia, modoPartida: Modo): void {
  textoTarjeta = generarTarjeta({
    modo: modoPartida === "practica" ? "practica" : "diario",
    dia: datos.dia,
    puntos: datos.puntos,
    altura: datos.altura,
    formas: datos.formas,
    origen: location.origin,
  });
  pintarFin({
    titulo: modoPartida === "practica" ? "Práctica" : `Reto del día #${datos.dia}`,
    puntos: datos.puntos,
    altura: datos.altura,
    tarjeta: textoTarjeta,
    puntosAmigo: puntosAmigo(modoPartida, datos.dia),
  });
  const juego = ui.juego();
  juego.dataset.puntos = String(datos.puntos);
  juego.dataset.altura = String(datos.altura);
  cambiarEstado("fin");
}

function terminar(actual: Partida): void {
  const { puntos, altura, formas } = actual.resultado();
  const datos: ResultadoDia = { dia, puntos, altura, formas };
  if (modo === "oficial") guardarResultado(almacen, datos);
  ui.juego().dataset.toques = JSON.stringify(toques);
  pintarContador(`${formatearPiezas(puntos)} · ${formatearAltura(altura)}`);
  partida = null;
  mostrarFin(datos, modo);
}

function pintarContador(texto: string): void {
  if (texto === contadorPintado) return;
  contadorPintado = texto;
  ui.contador().textContent = texto;
}

function actualizarContador(): void {
  if (!partida) return;
  const { puntos, altura } = partida.estado();
  pintarContador(`${formatearPiezas(puntos)} · ${formatearAltura(altura)}`);
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
    if (actual.terminada) {
      terminar(actual);
      return;
    }
  }
  const juego = ui.juego();
  juego.dataset.fase = actual.fase;
  // Posición de la pieza que cuelga, para que las pruebas toquen sobre la torre.
  const colgada = actual.estado().colgada;
  juego.dataset.x = colgada ? colgada.x.toFixed(2) : "";
  actualizarContador();
}

function pedirSoltar(): void {
  if (ui.juego().dataset.estado === "jugando") pendiente = true;
}

const bucle = new Bucle(avanzar, () => lienzo.dibujar(escena?.estado() ?? null));

ui.zona().addEventListener("pointerdown", (evento) => {
  if (ui.juego().dataset.estado !== "jugando") return;
  evento.preventDefault();
  pedirSoltar();
});
document.addEventListener("keydown", (evento) => {
  if (ui.juego().dataset.estado !== "jugando" || evento.repeat) return;
  if (evento.code === "Space" || evento.key === " " || evento.key === "Enter") {
    evento.preventDefault();
    pedirSoltar();
  }
});

ui.botonHoy().addEventListener("click", () => {
  const guardado = resultadoHoy();
  if (guardado) mostrarFin(guardado, "oficial");
  else empezar("oficial", hoy);
});
ui.botonReto().addEventListener("click", () => {
  if (reto) empezar("reto", reto.dia);
});
ui.botonPracticaInicio().addEventListener("click", () => empezar("practica", hoy));
ui.botonPracticaFin().addEventListener("click", () => empezar("practica", hoy));
ui.botonVolver().addEventListener("click", mostrarInicio);
ui.botonCopiar().addEventListener("click", async () => {
  ui.mensaje().textContent = (await copiar(textoTarjeta)) ? "Copiado" : "No se ha podido copiar: selecciona el texto.";
});
ui.botonCompartir().addEventListener("click", async () => {
  const resultado = await compartir(textoTarjeta);
  ui.mensaje().textContent = resultado === "error" ? "No se ha podido compartir." : "";
});

window.addEventListener("resize", () => lienzo.ajustar());
lienzo.ajustar();
mostrarInicio();
bucle.iniciar();
