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
import type { Pieza } from "../logica/piezas.ts";
import type { Calidad } from "../logica/puntuacion.ts";
import { Partida, type EstadoPartida, type Evento, type OpcionesPartida } from "../logica/simulacion.ts";
import { formatearAltura, formatearPuntos, generarTarjeta } from "../logica/tarjeta.ts";
import { Bucle, PASO_MS } from "./bucle.ts";
import { Lienzo, NIVEL_AGUA, ratioPixeles } from "./dibujo.ts";
import { Caidas, Efectos } from "./efectos.ts";
import { Haptica, puedeVibrar } from "./haptica.ts";
import { Sonido } from "./sonido.ts";
import { abrir, transicion, type Accion, type Flujo, type Modo, type Orden } from "./flujo.ts";
import { cambiarEstado, compartir, copiar, pintarFin, pintarHud, pintarReto, ui } from "./pantallas.ts";

/** Opciones de toda partida de esta página; van en `data-opciones` para reproducirla con `jugar` (G3). */
const OPCIONES: OpcionesPartida = { vidas: VIDAS_INICIALES };

/** Día de hoy en UTC. Se recalcula al empezar el reto de hoy y al volver a la pestaña. */
let hoy = numeroDia(fechaUTC(new Date()));
const almacen = almacenDelNavegador();
const reto = leerReto(location.search, hoy);
let registroLibre = leerRegistroLibre(almacen);

const lienzo = new Lienzo(ui.lienzo(), ui.grano());
// Sonido y vibración (A4): encendidos por defecto; se guardarán con el progreso (C1).
const sonido = new Sonido();
const haptica = new Haptica();
const movimientoReducido = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
const efectos = new Efectos({
  reducido: () => movimientoReducido?.matches === true,
  ratio: () => ratioPixeles(window.devicePixelRatio),
  conFuente: () => lienzo.conFuente,
  destinoVida,
});
lienzo.usarEfectos(efectos);
const caidas = new Caidas(NIVEL_AGUA, (x, ahora) => efectos.chapuzon(x, NIVEL_AGUA, ahora));
let ultimoFotograma = performance.now();
let efectosPintados = -1;
/** Piezas soltadas en esta partida, por índice, para situar sus efectos. */
let soltadas = new Map<number, Pieza>();
/** Pieza recién soltada que aún no ha tocado nada, con su calidad (A3). */
let enCaida: { pieza: Pieza; calidad: Calidad; combo: number; y: number; bajando: boolean } | null = null;
/** Piezas que ya han caído al mar (un chapuzón cada una). */
let mojadas = new WeakSet<Pieza>();
let recordCelebrado = false;
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
  soltadas = new Map();
  enCaida = null;
  mojadas = new WeakSet();
  recordCelebrado = false;
  efectos.reiniciar();
  caidas.reiniciar();
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
  // La última pieza caída sigue cayendo en pantalla aunque la partida ya la haya retirado.
  caidas.observar(actual.estado().cuerpos, 1, PASO_MS, performance.now());
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
    const eventos = actual.tomarEventos();
    if (eventos.length > 0) reaccionar(actual, eventos);
    if (actual.terminada) {
      terminar(actual);
      return;
    }
  }
  const juego = ui.juego();
  juego.dataset.fase = actual.fase;
  // Posición de la pieza que cuelga y del objetivo, para que las pruebas toquen sobre la torre.
  const estado = actual.estado();
  const { colgada, objetivo } = estado;
  juego.dataset.x = colgada ? colgada.x.toFixed(2) : "";
  juego.dataset.objetivo = objetivo.toFixed(2);
  if (pasos > 0) observar(estado, pasos);
  actualizarHud();
  pintarEfectos();
}

/** Centro de los iconos de vidas, en píxeles reales del lienzo: ahí vuela el corazón de vida extra. */
function destinoVida(): { x: number; y: number } {
  const vidas = ui.vidas().getBoundingClientRect();
  const lienzoCaja = ui.lienzo().getBoundingClientRect();
  const ratio = ratioPixeles(window.devicePixelRatio);
  return { x: (vidas.left + vidas.width / 2 - lienzoCaja.left) * ratio, y: (vidas.top + vidas.height / 2 - lienzoCaja.top) * ratio };
}

function posicion(estado: EstadoPartida, pieza: Pieza | undefined): { x: number; y: number } | null {
  const cuerpo = pieza && estado.cuerpos.find((c) => c.pieza === pieza);
  return cuerpo ? { x: cuerpo.x, y: cuerpo.y + pieza.alto / 2 } : null;
}

/** Efectos de cada evento de la partida (A3). Solo leen el estado: no cambian la física. */
function reaccionar(actual: Partida, eventos: Evento[]): void {
  const ahora = performance.now();
  const estado = actual.estado();
  for (const evento of eventos) {
    if (evento.tipo === "soltada") {
      const pieza = estado.cuerpos.at(-1)?.pieza;
      if (!pieza) continue;
      soltadas.set(evento.indice, pieza);
      efectos.soltada(pieza, ahora);
      sonido.tic();
      enCaida = { pieza, calidad: evento.calidad, combo: estado.combo + 1, y: estado.cuerpos.at(-1)!.y, bajando: false };
    } else if (evento.tipo === "colocada") {
      // Al tocar, la pieza suele quedarse quieta en el mismo paso y ya cuenta como colocada.
      if (enCaida && enCaida.pieza === soltadas.get(evento.indice)) aterrizar(estado, ahora);
      const sitio = posicion(estado, soltadas.get(evento.indice));
      if (sitio) efectos.colocada(evento.calidad, evento.combo, evento.puntos, sitio.x, sitio.y, ahora);
    } else if (evento.tipo === "caida") {
      efectos.caida(ahora);
      sonido.caida();
      haptica.vibrar("caida");
      enCaida = null;
    } else if (evento.tipo === "vidaExtra") {
      const sitio = posicion(estado, estado.cuerpos.at(-1)?.pieza) ?? { x: 0, y: estado.altura };
      efectos.vidaExtra(sitio.x, sitio.y, ahora);
      sonido.vidaExtra();
      haptica.vibrar("vidaExtra");
    } else if (evento.tipo === "hito") {
      efectos.hitoAltura(evento.metros, ahora);
      sonido.hito();
    }
  }
}

/**
 * Lo que solo se ve mirando las posiciones: cuándo toca la pieza soltada (para
 * aplastarla, el polvo y el perfecto) y cuándo algo cae al mar.
 */
function observar(estado: EstadoPartida, pasos: number): void {
  const ahora = performance.now();
  caidas.observar(estado.cuerpos, pasos, PASO_MS, ahora);
  for (const cuerpo of estado.cuerpos) {
    if (cuerpo.y - cuerpo.pieza.alto / 2 < NIVEL_AGUA && !mojadas.has(cuerpo.pieza)) {
      mojadas.add(cuerpo.pieza);
      efectos.chapuzon(cuerpo.x, NIVEL_AGUA, ahora);
    }
  }
  if (enCaida) {
    const seguida = enCaida;
    const cuerpo = estado.cuerpos.find((c) => c.pieza === seguida.pieza);
    if (!cuerpo || cuerpo.y - cuerpo.pieza.alto / 2 < NIVEL_AGUA) {
      enCaida = null;
    } else {
      // Metros por paso: baja deprisa mientras cae y casi se para al tocar.
      const bajada = (seguida.y - cuerpo.y) / pasos;
      if (bajada > 0.02) seguida.bajando = true;
      else if (seguida.bajando && bajada < 0.006) aterrizar(estado, ahora);
      if (enCaida) seguida.y = cuerpo.y;
    }
  }
  // Récord de la partida libre superado durante la partida.
  if (!recordCelebrado && flujo.modo === "libre" && registroLibre.record > 0 && estado.puntos > registroLibre.record) {
    recordCelebrado = true;
    efectos.record(estado.objetivo, estado.altura, ahora);
    sonido.record();
    haptica.vibrar("record");
  }
}

/** La pieza seguida toca la torre: aplastar, polvo y, si es perfecto, anillo, chispas y ojos contentos. */
function aterrizar(estado: EstadoPartida, ahora: number): void {
  const seguida = enCaida;
  enCaida = null;
  const cuerpo = seguida && estado.cuerpos.find((c) => c.pieza === seguida.pieza);
  if (!seguida || !cuerpo) return;
  efectos.aterrizaje(seguida.pieza, cuerpo.x, cuerpo.y, seguida.calidad, seguida.combo, ahora);
  sonido.toc();
  if (seguida.calidad === "perfecto") {
    lienzo.vista(seguida.pieza, ahora).contentaHasta = ahora + 900;
    sonido.perfecto(seguida.combo);
    haptica.vibrar("perfecto");
  } else {
    haptica.vibrar("aterrizar");
  }
}

/** Contadores de efectos en `data-efectos`, solo para las pruebas; se escriben cuando cambian. */
function pintarEfectos(): void {
  if (efectos.version === efectosPintados) return;
  efectosPintados = efectos.version;
  ui.juego().dataset.efectos = JSON.stringify(efectos.contadores);
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

const bucle = new Bucle(avanzar, () => {
  const ahora = performance.now();
  const sueltas = caidas.avanzar(ahora, ahora - ultimoFotograma);
  ultimoFotograma = ahora;
  lienzo.dibujar(escena?.estado() ?? null, ahora, sueltas);
  pintarEfectos();
});

/** ¿Tiene el foco un control que ya responde a Espacio e Intro por sí mismo? */
function focoEnControl(): boolean {
  const activo = document.activeElement;
  return activo instanceof HTMLButtonElement || activo instanceof HTMLAnchorElement || activo instanceof HTMLInputElement;
}

// El AudioContext se crea o se reanuda en el primer gesto, nunca antes (A4).
document.addEventListener("pointerdown", () => sonido.despertar(), { capture: true });
document.addEventListener("keydown", () => sonido.despertar(), { capture: true });

/** Botón de sonido o vibración: `aria-pressed` dice si está encendido. */
function pintarInterruptor(boton: HTMLButtonElement, encendido: boolean): void {
  boton.setAttribute("aria-pressed", String(encendido));
}
ui.botonSonido().addEventListener("click", () => {
  sonido.cambiar(!sonido.activo);
  pintarInterruptor(ui.botonSonido(), sonido.activo);
});
ui.botonVibracion().hidden = !puedeVibrar();
ui.botonVibracion().addEventListener("click", () => {
  haptica.cambiar(!haptica.activa);
  pintarInterruptor(ui.botonVibracion(), haptica.activa);
});

ui.zona().addEventListener("pointerdown", (evento) => {
  if (flujo.pantalla !== "jugando") return;
  // Los botones de la zona (sonido, vibración) no sueltan la pieza.
  if (evento.target instanceof Element && evento.target.closest("button")) return;
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
  sonido.visibilidad(document.hidden);
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
