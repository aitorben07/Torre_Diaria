// Punto de entrada de la página: une la simulación, el dibujo, la entrada de
// un toque y las pantallas. Las transiciones entre pantallas las decide
// `flujo.ts`; aquí solo se conectan con el DOM (B5). El progreso (monedas,
// récord, retos diarios, niveles, colección, C, D y E) se cambia solo con
// funciones puras de `src/logica/` aplicadas por `Guardado.cambiar`.
import { comprar, equipado, equipar, nuevosEscenarios, siguienteObjetivo } from "../logica/catalogo.ts";
import { actualizarRacha, medallaDe, medallaDePuntos, rachaDeHoy, registrarOficial, UMBRAL_BRONCE, UMBRAL_ORO, UMBRAL_PLATA, type Oficial } from "../logica/diarios.ts";
import { cobrarLibre, sumarEstadisticas, type LibreCobrada, type Medalla, type PartidaAcabada } from "../logica/economia.ts";
import { estrellasDe, nivelDisponible, nivelPorNumero, opcionesDeNivel, registrarNivel, textoMeta, textoObjetivo, totalEstrellas, type NivelRegistrado } from "../logica/niveles.ts";
import { leerLibre, leerReto } from "../logica/reto.ts";
import { almacenDelNavegador } from "../logica/registro.ts";
import { deTramos, Guardado, type DiaJugado } from "../logica/progreso.ts";
import { generarSecuencia } from "../logica/piezas.ts";
import { VIDAS_INICIALES, VIDAS_MAX } from "../logica/puntuacion.ts";
import { codigoDeSemilla, codigoLibre, fechaDeDia, fechaUTC, numeroDia, semillaLibre } from "../logica/semilla.ts";
import type { Pieza } from "../logica/piezas.ts";
import type { Calidad } from "../logica/puntuacion.ts";
import { Partida, REGLAS, type EstadoPartida, type Evento, type OpcionesPartida } from "../logica/simulacion.ts";
import { formatearAltura, formatearNumero, formatearPuntos, generarTarjeta, type DatosTarjeta } from "../logica/tarjeta.ts";
import { Bucle, PASO_MS } from "./bucle.ts";
import { PanelColeccion } from "./coleccion.ts";
import { PanelNiveles } from "./mapa.ts";
import { Lienzo, NIVEL_AGUA, ratioDePantalla } from "./dibujo.ts";
import { Caidas, Efectos } from "./efectos.ts";
import { Haptica, puedeVibrar } from "./haptica.ts";
import { pintarMuestra } from "./muestras.ts";
import { Sonido } from "./sonido.ts";
import { abrir, aceptaEntrada, transicion, type Accion, type Flujo, type Modo, type Orden, type Panel, type Pantalla } from "./flujo.ts";
import { anunciosDePlataforma, aplicarLlamadas, llamadasAlAbrir, llamadasDeTransicion } from "./anuncios.ts";
import { compartir, descargar, ImagenCompartida, puedeCompartirArchivos } from "./compartir.ts";
import type { DatosImagen } from "./imagen.ts";
import { cambiarEstado, copiar, mostrarTexto, NOMBRE_MEDALLA, pintarBarra, pintarFin, pintarHud, pintarLibreAmigo, pintarReto, ui, type DatosFin as DatosPantallaFin } from "./pantallas.ts";
import { PanelRetos } from "./retos.ts";
import { escenarioPorId, temaPorId } from "./temas.ts";

/** Opciones de la partida libre y del reto diario; van en `data-opciones` para reproducirla con `jugar` (G3). */
const OPCIONES: OpcionesPartida = { vidas: VIDAS_INICIALES };
/** Pausa entre estrellas al acabar un nivel (E3). */
const ESTRELLA_MS = 380;

/** Día de hoy en UTC. Se recalcula en cada acción y al volver a la pestaña. */
let hoy = numeroDia(fechaUTC(new Date()));
const almacen = almacenDelNavegador();
/** Anuncios de esta compilación (G1): en la web, ninguno (`anunciosNulos`). */
const anuncios = anunciosDePlataforma(import.meta.env.PUBLIC_PLATAFORMA);
const reto = leerReto(location.search, hoy);
/** Partida libre del enlace de un amigo (F2); si hay reto, manda el reto. */
const libreAmigo = reto ? null : leerLibre(location.search);
/** Progreso guardado (C1): una sola clave; si el almacenamiento falla, queda en memoria. */
const guardado = new Guardado(almacen);

const lienzo = new Lienzo(ui.lienzo(), ui.grano());
// Sonido y vibración (A4): encendidos por defecto y guardados en `ajustes` (C1).
const sonido = new Sonido();
const haptica = new Haptica();
// Encender el sonido despierta el AudioContext, que no se crea hasta el primer gesto: solo se aplica si está apagado.
if (!guardado.actual.ajustes.sonido) sonido.cambiar(false);
haptica.cambiar(guardado.actual.ajustes.vibracion);
const movimientoReducido = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
const efectos = new Efectos({
  reducido: () => movimientoReducido?.matches === true,
  ratio: ratioDePantalla,
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
/** Partidas empezadas en esta página, para el identificador de cada una. */
let partidasEmpezadas = 0;
/**
 * Identifica la partida en marcha para cobrarla una sola vez (C2): su semilla,
 * el número de partida y un código al azar, porque al recargar o en otra
 * pestaña la cuenta vuelve a empezar y la semilla puede repetirse (`?libre=`).
 */
let idPartida = "";
/** Día (UTC) en que empezó la partida en marcha: el reto oficial que cruza la medianoche cuenta en su día. */
let diaEmpezada = hoy;
/** Partida que se dibuja: sigue en pantalla, quieta, tras acabar. */
let escena: Partida | null = null;
let flujo: Flujo;
let pendiente = false;
let toques: number[] = [];
let textoTarjeta = "";
let hudPintado = "";
/** Modo de lo que muestra la pantalla de fin, para refrescar el siguiente objetivo al volver a ella. */
let modoFin: Modo = "libre";
/** Fin de un nivel: si se ganó y si ya se puede jugar el siguiente (para el botón principal). */
let finNivel: { victoria: boolean; haySiguiente: boolean } | null = null;
/** Imagen del fin y de la ficha del día en Retos, generadas de antemano (F3). */
const imagenFin = new ImagenCompartida();
const imagenDia = new ImagenCompartida();
/** Día, tema y escenario de la imagen de la ficha: si cambia cualquiera, se vuelve a generar. */
let claveImagenDia = "";
let temporizadoresEstrellas: number[] = [];

/** Recalcula `hoy`, por si ha pasado la medianoche UTC. Devuelve si ha cambiado. */
function actualizarHoy(): boolean {
  const ahora = numeroDia(fechaUTC(new Date()));
  if (ahora === hoy) return false;
  hoy = ahora;
  return true;
}

/** Tema y escenario equipados (C3), en el lienzo. */
function aplicarEquipado(): void {
  const { tema, escenario } = equipado(guardado.actual);
  lienzo.cambiarTema(temaPorId(tema), escenarioPorId(escenario));
}

function pintarBarraActual(): void {
  pintarBarra({ racha: rachaDeHoy(guardado.actual, hoy), monedas: guardado.actual.monedas, estrellas: totalEstrellas(guardado.actual) });
}

/** Al abrir y al cambiar de día: gasta congeladores o corta la racha (D1). Solo guarda si cambia algo. */
function revisarRacha(): void {
  if (actualizarRacha(guardado.actual, hoy) !== guardado.actual) guardado.cambiar((p) => actualizarRacha(p, hoy));
  pintarBarraActual();
}

/** Lo que se muestra en el fin: una partida recién acabada o un día guardado. */
type DatosFin = {
  dia: number;
  puntos: number;
  altura: number;
  piezas: number;
  /** Piezas colocadas, de abajo arriba, para la imagen (F1). */
  formas: Array<Pick<Pieza, "forma" | "ancho" | "alto" | "color">>;
  reglas: number;
  /** Para la fila de datos de la imagen; `null` si no se guardó. */
  perfectos: number | null;
  comboMax: number | null;
};

function resultadoDe(dia: number): DiaJugado | null {
  return guardado.actual.diarios[dia] ?? null;
}

/** Datos de fin de un día guardado: las piezas se rehacen con la semilla del día y sus índices. */
function datosDeDia(dia: number, jugado: DiaJugado): DatosFin {
  const indices = deTramos(jugado.colocadas) ?? [];
  const secuencia = indices.length > 0 ? generarSecuencia(fechaDeDia(dia), indices[indices.length - 1]! + 1) : [];
  const formas = indices.map((i) => secuencia[i]!).filter(Boolean);
  const v2 = jugado.reglas === REGLAS;
  return { dia, puntos: jugado.puntos, altura: jugado.altura, piezas: jugado.piezas, formas, reglas: jugado.reglas, perfectos: v2 ? jugado.perfectos : null, comboMax: null };
}

/** Aplica una acción de la interfaz: el flujo decide y aquí se ejecuta la orden. */
function actuar(accion: Accion): void {
  if (accion.tipo !== "terminar") {
    guardado.releer();
    if (actualizarHoy()) revisarRacha();
  }
  const siguiente = transicion(flujo, accion, {
    ahora: performance.now(),
    hoy,
    jugado: (dia) => resultadoDe(dia) !== null,
    nivelDisponible: (nivel) => nivelDisponible(guardado.actual, nivel),
  });
  const antes = flujo;
  flujo = siguiente.flujo;
  // Huecos de anuncios (G1): avisos de partida y el intersticial de «Otra vez» o «Siguiente nivel».
  aplicarLlamadas(anuncios, llamadasDeTransicion(antes, flujo, accion, siguiente.orden), () => ejecutar(siguiente.orden));
}

function ejecutar(orden: Orden): void {
  if (orden.tipo === "jugar") empezar(orden.modo, orden.dia, orden.nivel, orden.codigo);
  else if (orden.tipo === "resultado") verGuardado(orden.dia);
  else if (orden.tipo === "reto") mostrarReto();
  else if (orden.tipo === "panel") mostrarPanel(orden.panel);
  else if (orden.tipo === "volver") volver(orden.pantalla);
}

function mostrarReto(): void {
  if (!reto && !libreAmigo) return;
  partida = null;
  escena = null;
  if (reto) {
    const jugado = resultadoDe(reto.dia);
    pintarReto({ hoy, reto, jugado: jugado !== null, puntosDia: jugado && jugado.reglas === REGLAS ? jugado.puntos : null });
  } else if (libreAmigo) {
    pintarLibreAmigo(libreAmigo.puntos);
  }
  pintarHud({ puntos: 0, vidas: VIDAS_INICIALES, vidasMax: VIDAS_MAX, combo: 0, record: null });
  cambiarEstado("reto");
  actualizarBotones();
  lienzo.reservarArriba(0);
  lienzo.ponerRecord(null);
}

/** Texto de la medalla de un día: el metal (o «Sin medalla») y si sumó racha o fue atrasado. */
function textoDiario(medalla: Medalla | null, cola: string): string {
  return `${medalla ? NOMBRE_MEDALLA[medalla] : "Sin medalla"} · ${cola}`;
}

/** La siguiente medalla por conseguir en el reto diario, para empujar a superarse. */
function siguienteMedalla(puntos: number): string | null {
  const metas: Array<[Medalla, number]> = [
    ["bronce", UMBRAL_BRONCE],
    ["plata", UMBRAL_PLATA],
    ["oro", UMBRAL_ORO],
  ];
  const meta = metas.find(([, umbral]) => puntos < umbral);
  return meta ? `${NOMBRE_MEDALLA[meta[0]]} desde ${formatearNumero(meta[1])} puntos` : null;
}

function verGuardado(dia: number): void {
  const jugado = resultadoDe(dia);
  if (!jugado) return;
  partida = null;
  escena = null;
  ui.juego().dataset.modo = "oficial";
  const medalla = medallaDe(jugado);
  const cola = jugado.reglas === 1 ? "con la versión anterior" : jugado.enSuDia ? "jugado en su día" : "atrasado";
  mostrarFin(datosDeDia(dia, jugado), "oficial", { diario: { medalla, texto: textoDiario(medalla, cola) }, monedas: null });
}

/** Retos, Niveles y Colección se ven siempre salvo mientras se juega un reto diario. */
function actualizarBotones(): void {
  const ocultar = flujo.pantalla === "jugando" && (flujo.modo === "oficial" || flujo.modo === "repeticion");
  ui.botonRetos().hidden = ocultar;
  ui.botonNiveles().hidden = ocultar;
  ui.botonColeccion().hidden = ocultar;
}

function empezar(modo: Modo, dia: number, numeroNivel: number = 0, codigo?: string): void {
  const nivel = modo === "nivel" ? nivelPorNumero(numeroNivel) : null;
  const semilla = nivel ? nivel.semilla : modo === "libre" ? semillaLibre(codigo) : fechaDeDia(dia);
  const opciones = nivel ? opcionesDeNivel(nivel) : OPCIONES;
  partida = new Partida(semilla, opciones);
  partidasEmpezadas++;
  idPartida = `${semilla}#${partidasEmpezadas}.${codigoLibre()}`;
  diaEmpezada = hoy;
  pararEstrellas();
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
  juego.dataset.opciones = JSON.stringify(opciones);
  juego.dataset.nivel = String(nivel?.numero ?? 0);
  juego.dataset.fase = partida.fase;
  delete juego.dataset.toques;
  delete juego.dataset.puntos;
  delete juego.dataset.altura;
  delete juego.dataset.victoria;
  delete juego.dataset.estrellas;
  ui.avisoToque().hidden = guardado.actual.ajustes.tutorialVisto;
  aplicarEquipado();
  lienzo.ponerRecord(modo === "libre" ? guardado.actual.libre.alturaRecord : null);
  lienzo.reiniciarCamara();
  lienzo.reservarArriba(0);
  bucle.reiniciar();
  (document.activeElement as HTMLElement | null)?.blur();
  cambiarEstado("jugando");
  actualizarBotones();
  hudPintado = "";
  actualizarHud();
}

/** Puntos del amigo si la partida (o el resultado) responde a su reto o a su partida libre. */
function puntosAmigo(modoPartida: Modo, diaPartida: number): number | null {
  if (modoPartida === "libre") {
    const codigo = codigoDeSemilla(ui.juego().dataset.semilla ?? "");
    return libreAmigo && codigo === libreAmigo.semilla ? libreAmigo.puntos : null;
  }
  if (!reto || modoPartida === "nivel" || reto.dia !== diaPartida) return null;
  return reto.puntos;
}

/** Racha que se escribe en la tarjeta y la imagen: solo en el oficial de hoy jugado en su día. */
function rachaDelDia(dia: number): number {
  return dia === hoy && resultadoDe(dia)?.enSuDia ? rachaDeHoy(guardado.actual, hoy) : 0;
}

/** Datos de la imagen (F1) de lo que muestra el fin o la ficha de un día, con el tema y el escenario equipados. */
function datosImagen(datos: DatosFin, modoPartida: Modo, premios: Premios): DatosImagen {
  const { tema, escenario } = equipado(guardado.actual);
  const enPiezas = datos.reglas === 1;
  return {
    modo: modoPartida === "nivel" ? "nivel" : modoPartida === "libre" ? "libre" : "diario",
    dia: datos.dia,
    nivel: flujo.nivel,
    estrellas: premios.nivel?.estrellas ?? 0,
    puntos: enPiezas ? datos.piezas : datos.puntos,
    enPiezas,
    altura: datos.altura,
    perfectos: datos.perfectos,
    comboMax: datos.comboMax,
    racha: modoPartida === "oficial" ? rachaDelDia(datos.dia) : 0,
    formas: datos.formas,
    tema: temaPorId(tema),
    escenario: escenarioPorId(escenario),
    host: location.host,
  };
}

/** Nombre del PNG descargado: `torre-diaria-<modo>.png`. */
function nombreImagen(modoPartida: Modo): string {
  return `torre-diaria-${modoPartida === "nivel" ? "nivel" : modoPartida === "libre" ? "libre" : "reto"}.png`;
}

/** Datos de la tarjeta de texto (F2) para lo que muestra el fin. */
function datosTarjeta(datos: DatosFin, modoPartida: Modo, premios: Premios): DatosTarjeta {
  const origen = location.origin;
  if (modoPartida === "nivel") {
    return { modo: "nivel", nivel: flujo.nivel, estrellas: premios.nivel?.estrellas ?? 0, victoria: premios.nivel?.victoria ?? false, origen };
  }
  if (modoPartida === "libre") {
    return { modo: "libre", codigo: codigoDeSemilla(ui.juego().dataset.semilla ?? ""), puntos: datos.puntos, altura: datos.altura, origen };
  }
  const enPiezas = datos.reglas === 1;
  // La racha solo se escribe en el oficial de hoy jugado en su día (recién acabado o visto después).
  const racha = modoPartida === "oficial" ? rachaDelDia(datos.dia) : 0;
  const repeticion = modoPartida === "repeticion";
  return { modo: "diario", dia: datos.dia, puntos: enPiezas ? datos.piezas : datos.puntos, altura: datos.altura, enPiezas, repeticion, racha, origen };
}

type Premios = Pick<DatosPantallaFin, "nuevoRecord" | "diario" | "monedas" | "desbloqueo" | "siguiente" | "nivel">;

/** Título del fin según el modo. */
function tituloFin(modoPartida: Modo, dia: number): string {
  if (modoPartida === "libre") return "Partida libre";
  if (modoPartida === "nivel") return `Nivel ${flujo.nivel}`;
  return modoPartida === "repeticion" ? `Reto del día #${dia} (no cuenta)` : `Reto del día #${dia}`;
}

/** Texto del botón principal del fin: en un nivel, «Siguiente nivel» si se ganó y hay otro; si no, «Repetir». */
function textoPrincipal(modoPartida: Modo): string {
  if (modoPartida === "libre") return "Otra vez";
  if (modoPartida !== "nivel") return "Partida libre";
  return finNivel?.victoria && finNivel.haySiguiente ? "Siguiente nivel" : "Repetir";
}

/** Lo que hace el botón principal del fin (y Espacio o Intro en el fin). */
function accionPrincipal(): Accion {
  if (flujo.modo !== "nivel") return { tipo: "libre" };
  return finNivel?.victoria && finNivel.haySiguiente ? { tipo: "siguienteNivel" } : { tipo: "jugarNivel", nivel: flujo.nivel };
}

function pararEstrellas(): void {
  for (const t of temporizadoresEstrellas) clearTimeout(t);
  temporizadoresEstrellas = [];
}

/** Estrellas del fin de un nivel una a una, cada una con su nota y su vibración (E3, Anexo 1, 1.6). */
function celebrarEstrellas(estrellas: number): void {
  pararEstrellas();
  for (let i = 1; i <= estrellas; i++) {
    temporizadoresEstrellas.push(
      window.setTimeout(() => {
        sonido.estrella(i);
        haptica.vibrar("estrella");
      }, ESTRELLA_MS * i),
    );
  }
}

function mostrarFin(datos: DatosFin, modoPartida: Modo, premios: Premios = {}): void {
  const libre = modoPartida === "libre";
  const enPiezas = datos.reglas === 1;
  modoFin = modoPartida;
  finNivel = modoPartida === "nivel" && premios.nivel ? { victoria: premios.nivel.victoria, haySiguiente: premios.nivel.haySiguiente } : null;
  textoTarjeta = generarTarjeta(datosTarjeta(datos, modoPartida, premios));
  pintarFin({
    titulo: tituloFin(modoPartida, datos.dia),
    puntos: enPiezas ? datos.piezas : datos.puntos,
    enPiezas,
    altura: datos.altura,
    tarjeta: textoTarjeta,
    record: libre ? guardado.actual.libre.record : null,
    puntosAmigo: puntosAmigo(modoPartida, datos.dia),
    principal: textoPrincipal(modoPartida),
    siguiente: libre ? siguienteObjetivo(guardado.actual) : null,
    ...premios,
  });
  const juego = ui.juego();
  juego.dataset.puntos = String(datos.puntos);
  juego.dataset.altura = String(datos.altura);
  cambiarEstado("fin");
  actualizarBotones();
  pintarBarraActual();
  if (premios.nivel) celebrarEstrellas(premios.nivel.estrellas);
  // La imagen se genera ya, con el panel visible, para que «Compartir» no tenga que esperar (impacto, F3).
  imagenFin.preparar(datosImagen(datos, modoPartida, premios), nombreImagen(modoPartida), ui.finImagen());
  if (premios.desbloqueo) pintarMuestra(ui.finDesbloqueoMuestra(), temaPorId(equipado(guardado.actual).tema), escenarioPorId(premios.desbloqueo.id));
  lienzo.ponerRecord(null);
  reservarTarjeta();
}

/** Lo que tapa la tarjeta de fin por arriba, para que la cámara deje la cima debajo. */
function reservarTarjeta(): void {
  const zona = ui.zona().getBoundingClientRect();
  lienzo.reservarArriba(ui.fin().getBoundingClientRect().bottom - zona.top);
}

/**
 * Cobra la partida acabada (C2, D1): la libre suma monedas y récord; la
 * oficial guarda el día con su medalla, racha y premio; la repetición, nada.
 * Avisa de los escenarios que se desbloquean y del siguiente objetivo.
 */
function cobrar(actual: Partida, modo: Modo, dia: number): Premios {
  const r = actual.resultado();
  const partidaAcabada: PartidaAcabada = {
    id: idPartida,
    puntos: r.puntos,
    piezas: r.piezas,
    perfectos: r.perfectos,
    comboMax: r.comboMax,
    alturaMax: r.alturaMax,
  };
  const antes = guardado.releer();
  const premios: Premios = {};
  if (modo === "libre") {
    // Monedas y récord salen de lo que se ha guardado: si la partida ya se cobró, ni lo uno ni lo otro.
    let libre: LibreCobrada | null = null;
    guardado.cambiar((p) => {
      libre = cobrarLibre(p, partidaAcabada);
      return libre.progreso;
    });
    const hecho = libre as LibreCobrada | null;
    premios.monedas = hecho?.nuevo ? hecho.monedas : null;
    premios.nuevoRecord = hecho?.nuevoRecord ?? false;
  } else if (modo === "oficial") {
    // Con dos pestañas vale la primera oficial que acaba (D4): el cambio se aplica sobre lo releído.
    let oficial: Oficial | null = null;
    guardado.cambiar((p) => {
      oficial = registrarOficial(p, dia, diaEmpezada, { ...partidaAcabada, altura: r.altura, indices: r.indices });
      return oficial.progreso;
    });
    const hecho = oficial as Oficial | null;
    const medalla = medallaDePuntos(r.puntos);
    const racha = rachaDeHoy(guardado.actual, diaEmpezada);
    if (hecho?.nuevo) {
      premios.monedas = hecho.monedas;
      const cola = dia === diaEmpezada ? `racha de ${racha} ${racha === 1 ? "día" : "días"}` : "atrasado, no suma racha";
      premios.diario = { medalla, texto: textoDiario(medalla, cola) };
    } else {
      premios.monedas = null;
      premios.diario = { medalla: null, texto: "Este día ya estaba jugado: no cuenta" };
    }
    premios.siguiente = siguienteMedalla(r.puntos);
  } else {
    premios.monedas = null;
    premios.siguiente = siguienteMedalla(r.puntos);
  }
  const nuevo = nuevosEscenarios(antes, guardado.actual)[0];
  premios.desbloqueo = nuevo ? { id: nuevo.id, texto: `Nuevo escenario: ${nuevo.nombre}` } : null;
  return premios;
}

/**
 * Cobra un nivel acabado (E1): guarda la mejor marca de estrellas y da 20
 * monedas por estrella nueva (y 200 al completar el mundo con 3 en todo).
 */
function cobrarNivel(actual: Partida, numero: number): Premios {
  const nivel = nivelPorNumero(numero);
  if (!nivel) return {};
  const r = actual.resultado();
  const estrellas = estrellasDe(nivel, r);
  let registro: NivelRegistrado | null = null;
  guardado.cambiar((p) => {
    registro = registrarNivel(p, numero, estrellas);
    return sumarEstadisticas(registro.progreso, {
      id: idPartida,
      puntos: r.puntos,
      piezas: r.piezas,
      perfectos: r.perfectos,
      comboMax: r.comboMax,
      alturaMax: r.alturaMax,
    });
  });
  const hecho = registro as NivelRegistrado | null;
  const monedas = hecho?.monedas ?? 0;
  const juego = ui.juego();
  juego.dataset.victoria = String(r.victoria);
  juego.dataset.estrellas = String(estrellas);
  return {
    monedas: monedas > 0 ? monedas : null,
    nivel: { objetivo: textoObjetivo(nivel), estrellas, victoria: r.victoria, haySiguiente: nivelDisponible(guardado.actual, numero + 1) },
    siguiente: hecho?.mundoCompletado ? "Puerto completado con 3 estrellas en todo" : null,
  };
}

function terminar(actual: Partida): void {
  const { puntos, altura, formas, piezas, perfectos, comboMax } = actual.resultado();
  const { modo, dia } = flujo;
  const premios = modo === "nivel" ? cobrarNivel(actual, flujo.nivel) : cobrar(actual, modo, dia);
  ui.juego().dataset.toques = JSON.stringify(toques);
  // La última pieza caída sigue cayendo en pantalla aunque la partida ya la haya retirado.
  caidas.observar(actual.estado().cuerpos, 1, PASO_MS, performance.now());
  // En un nivel, la última pieza suma y acaba en el mismo paso: el HUD se pone al día antes de cerrar.
  actualizarHud();
  partida = null;
  actuar({ tipo: "terminar" });
  ui.contador().textContent = `${formatearPuntos(puntos)} · ${formatearAltura(altura)}`;
  hudPintado = "";
  mostrarFin({ dia, puntos, altura, piezas, formas, reglas: REGLAS, perfectos, comboMax }, modo, premios);
}

/** Abre Retos, Niveles o Colección encima de la pantalla que hubiera (si era una partida, queda en pausa). */
function mostrarPanel(panel: Panel): void {
  cambiarEstado(panel);
  ui.avisoToque().hidden = true;
  if (panel === "retos") panelRetos.abrir();
  else if (panel === "niveles") panelNiveles.abrir();
  else panelColeccion.pintar(guardado.actual);
  pintarBarraActual();
}

/** Cierra el panel y vuelve a la pantalla de debajo; la partida en pausa sigue sin saltos. */
function volver(pantalla: Exclude<Pantalla, Panel>): void {
  cambiarEstado(pantalla);
  actualizarBotones();
  if (pantalla === "jugando") {
    bucle.reiniciar();
    ui.avisoToque().hidden = guardado.actual.ajustes.tutorialVisto;
  } else if (pantalla === "fin") {
    if (modoFin === "libre") mostrarTexto(ui.finSiguiente(), siguienteObjetivo(guardado.actual));
    reservarTarjeta();
  }
}

/** Tras comprar o equipar: se guarda, se aplica al lienzo y se repintan barra y panel. */
function cambiarColeccion(cambio: (p: typeof guardado.actual) => typeof guardado.actual, mensaje: string): void {
  guardado.cambiar(cambio);
  aplicarEquipado();
  pintarBarraActual();
  ui.mensajeColeccion().textContent = mensaje;
  if (flujo.pantalla === "coleccion") panelColeccion.pintar(guardado.actual);
  if (flujo.pantalla === "retos") panelRetos.pintar();
}

const panelNiveles = new PanelNiveles({ jugar: (nivel) => actuar({ tipo: "jugarNivel", nivel }) }, () => guardado.actual);

const panelColeccion = new PanelColeccion(
  {
    // Comprar un tema lo pone al momento: se ve lo que se ha ganado.
    comprar: (id) => {
      const puede = comprar(guardado.releer(), id) !== guardado.actual;
      cambiarColeccion((p) => {
        const comprado = comprar(p, id);
        return comprado === p ? p : equipar(comprado, id);
      }, puede ? `Tema ${temaPorId(id).nombre} comprado y puesto` : "");
    },
    equipar: (id) => cambiarColeccion((p) => equipar(p, id), ""),
  },
  () => guardado.actual,
);

/** Prepara la imagen de un día jugado al pintar su ficha en Retos (F3). */
function prepararDia(dia: number): void {
  const jugado = resultadoDe(dia);
  const { tema, escenario } = equipado(guardado.actual);
  const clave = `${dia}|${tema}|${escenario}`;
  if (!jugado || (clave === claveImagenDia && imagenDia.archivo)) return;
  claveImagenDia = clave;
  imagenDia.preparar(datosImagen(datosDeDia(dia, jugado), "oficial", {}), nombreImagen("oficial"));
}

/** Descarga la imagen de un día desde su ficha. */
async function descargarDia(dia: number): Promise<string> {
  prepararDia(dia);
  const blob = await imagenDia.blob();
  if (!blob) return "No se ha podido crear la imagen.";
  descargar(blob, nombreImagen("oficial"));
  return "";
}

/** Un día guardado desde su ficha: con `navigator.share` (con la imagen si se admite) o el texto copiado. */
async function compartirDia(dia: number): Promise<string> {
  const jugado = resultadoDe(dia);
  if (!jugado) return "";
  prepararDia(dia);
  const enPiezas = jugado.reglas === 1;
  const texto = generarTarjeta({ modo: "diario", dia, puntos: enPiezas ? jugado.piezas : jugado.puntos, altura: jugado.altura, enPiezas, origen: location.origin });
  if (typeof navigator.share === "function") {
    const resultado = await compartir(texto, puedeCompartirArchivos() ? imagenDia.archivo : null);
    if (resultado === "sinPermiso") ui.fichaDescargar().hidden = false;
    return resultado === "error" ? "No se ha podido compartir." : "";
  }
  return (await copiar(texto)) ? "Copiado" : "No se ha podido copiar.";
}

const panelRetos = new PanelRetos(
  {
    jugar: (dia) => actuar({ tipo: "jugarDia", dia }),
    repetir: (dia) => actuar({ tipo: "repetirDia", dia }),
    compartir: compartirDia,
    preparar: prepararDia,
    descargar: descargarDia,
    comprarCongelador: () => cambiarColeccion((p) => comprar(p, "congelador"), ""),
  },
  () => ({ progreso: guardado.actual, hoy }),
);

function actualizarHud(): void {
  if (!partida) return;
  const { puntos, vidas, combo } = partida.estado();
  const record = flujo.modo === "libre" ? guardado.actual.libre.record : null;
  const nivel = flujo.modo === "nivel" ? nivelPorNumero(flujo.nivel) : null;
  const clave = `${puntos}|${vidas}|${combo}|${record}|${flujo.nivel}`;
  if (clave === hudPintado) return;
  hudPintado = clave;
  pintarHud({ puntos, vidas, vidasMax: VIDAS_MAX, combo, record, meta: nivel ? textoMeta(nivel) : null });
}


/** Aplica los pasos que tocan. Un toque se aplica en el siguiente paso y se anota su número. */
function avanzar(pasos: number): void {
  const actual = partida;
  // Con Retos o Colección abiertos encima, la partida queda en pausa.
  if (!actual || flujo.pantalla !== "jugando") return;
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
  const ratio = ratioDePantalla();
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
  const record = guardado.actual.libre.record;
  if (!recordCelebrado && flujo.modo === "libre" && record > 0 && estado.puntos > record) {
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
  if (!guardado.actual.ajustes.tutorialVisto) {
    guardado.cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, tutorialVisto: true } }));
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
pintarInterruptor(ui.botonSonido(), sonido.activo);
pintarInterruptor(ui.botonVibracion(), haptica.activa);
ui.botonSonido().addEventListener("click", () => {
  sonido.cambiar(!sonido.activo);
  pintarInterruptor(ui.botonSonido(), sonido.activo);
  const activo = sonido.activo;
  guardado.cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, sonido: activo } }));
});
ui.botonVibracion().hidden = !puedeVibrar();
ui.botonVibracion().addEventListener("click", () => {
  haptica.cambiar(!haptica.activa);
  pintarInterruptor(ui.botonVibracion(), haptica.activa);
  const activa = haptica.activa;
  guardado.cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, vibracion: activa } }));
});

ui.zona().addEventListener("pointerdown", (evento) => {
  if (flujo.pantalla !== "jugando") return;
  // Los botones de la zona (sonido, vibración, retos, colección) no sueltan la pieza.
  if (evento.target instanceof Element && evento.target.closest("button")) return;
  evento.preventDefault();
  pedirSoltar();
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && (flujo.pantalla === "retos" || flujo.pantalla === "niveles" || flujo.pantalla === "coleccion")) {
    actuar({ tipo: "cerrar" });
    return;
  }
  if (evento.repeat || !(evento.code === "Space" || evento.key === " " || evento.key === "Enter")) return;
  if (flujo.pantalla === "jugando") {
    evento.preventDefault();
    pedirSoltar();
  } else if (flujo.pantalla === "fin" && !focoEnControl()) {
    // En el fin, Espacio o Intro equivalen al botón principal (pasados 700 ms).
    evento.preventDefault();
    actuar(accionPrincipal());
  }
});

ui.botonOtraVez().addEventListener("click", () => actuar(accionPrincipal()));
ui.botonRepetirNivel().addEventListener("click", () => actuar({ tipo: "jugarNivel", nivel: flujo.nivel }));
ui.botonMapa().addEventListener("click", () => actuar({ tipo: "abrir", panel: "niveles" }));
ui.botonLibreNivel().addEventListener("click", () => actuar({ tipo: "libre" }));
ui.botonLibreReto().addEventListener("click", () => actuar({ tipo: "libre" }));
/** Retos, Niveles y Colección abren su panel; si ya está abierto, lo cierran. */
function alternarPanel(panel: Panel): void {
  actuar(flujo.pantalla === panel ? { tipo: "cerrar" } : { tipo: "abrir", panel });
}
ui.botonRetos().addEventListener("click", () => alternarPanel("retos"));
ui.botonNiveles().addEventListener("click", () => alternarPanel("niveles"));
ui.botonColeccion().addEventListener("click", () => alternarPanel("coleccion"));
ui.botonCerrarRetos().addEventListener("click", () => actuar({ tipo: "cerrar" }));
ui.botonCerrarNiveles().addEventListener("click", () => actuar({ tipo: "cerrar" }));
ui.botonCerrarColeccion().addEventListener("click", () => actuar({ tipo: "cerrar" }));
ui.botonReto().addEventListener("click", () => {
  if (reto) actuar({ tipo: "jugarReto", reto });
  else if (libreAmigo) actuar({ tipo: "libre", codigo: libreAmigo.semilla });
});
ui.botonRepetirReto().addEventListener("click", () => {
  if (reto) actuar({ tipo: "repetirDia", dia: reto.dia });
});
/** Los botones del fin ignoran los toques de los primeros 700 ms, como el principal (impacto, 2.5). */
function finListo(): boolean {
  return aceptaEntrada(flujo, performance.now());
}
ui.botonEquiparNuevo().addEventListener("click", () => {
  if (!finListo()) return;
  const id = ui.botonEquiparNuevo().dataset.articulo ?? "";
  cambiarColeccion((p) => equipar(p, id), "");
  ui.finDesbloqueoTexto().textContent = `${escenarioPorId(id).nombre}: en uso`;
  ui.botonEquiparNuevo().hidden = true;
});
ui.botonCopiar().addEventListener("click", async () => {
  if (!finListo()) return;
  ui.mensaje().textContent = (await copiar(textoTarjeta)) ? "Copiado" : "No se ha podido copiar: selecciona el texto.";
});
ui.botonCompartir().addEventListener("click", async () => {
  if (!finListo()) return;
  // Sin esperas: la imagen ya está hecha desde que se mostró el fin (si aún no, se comparte cuando esté).
  let archivo = imagenFin.archivo;
  if (!archivo && puedeCompartirArchivos()) {
    await imagenFin.blob();
    archivo = imagenFin.archivo;
  }
  const resultado = await compartir(textoTarjeta, puedeCompartirArchivos() ? archivo : null);
  // Sin permiso (el toque ya no cuenta, Safari): se ofrece descargar la imagen, sin mensaje de error.
  if (resultado === "sinPermiso") ui.botonDescargar().hidden = false;
  ui.mensaje().textContent = resultado === "error" ? "No se ha podido compartir." : "";
});
ui.botonDescargar().addEventListener("click", async () => {
  if (!finListo()) return;
  const blob = await imagenFin.blob();
  if (!blob) {
    ui.mensaje().textContent = "No se ha podido crear la imagen.";
    return;
  }
  descargar(blob, imagenFin.nombre ?? nombreImagen(modoFin));
  ui.mensaje().textContent = "";
  // El foco vuelve al botón principal: Espacio e Intro siguen empezando otra partida, no otra descarga.
  ui.botonOtraVez().focus();
});

document.addEventListener("visibilitychange", () => {
  sonido.visibilidad(document.hidden);
  if (document.visibilityState !== "visible") return;
  guardado.releer();
  if (!actualizarHoy()) return;
  revisarRacha();
  if (flujo.pantalla === "reto") mostrarReto();
  if (flujo.pantalla === "retos") panelRetos.pintar();
});
// El lienzo cambia de tamaño con la ventana y también con el HUD (combo, récord):
// se reajusta cada vez que cambia su caja, no solo al redimensionar la ventana.
/** El lienzo ocupa toda la pantalla; la vista se encaja en la columna del HUD y por debajo de él (A5). */
function ajustarLienzo(): void {
  const hud = ui.hud().getBoundingClientRect();
  lienzo.ajustar(hud.width, hud.bottom - ui.zona().getBoundingClientRect().top);
}
const observador = new ResizeObserver(() => {
  ajustarLienzo();
  if (flujo.pantalla === "fin") reservarTarjeta();
});
observador.observe(ui.lienzo());
observador.observe(ui.hud());
aplicarEquipado();
revisarRacha();
const inicio = abrir(reto, hoy, libreAmigo);
flujo = inicio.flujo;
aplicarLlamadas(anuncios, llamadasAlAbrir(inicio.orden), () => ejecutar(inicio.orden));
ajustarLienzo();
bucle.iniciar();
