// Punto de entrada de la página: une la simulación, el dibujo, la entrada de
// un toque y las pantallas. Las transiciones entre pantallas las decide
// `flujo.ts`; aquí solo se conectan con el DOM (B5). El progreso (monedas,
// récord, retos diarios, niveles, colección, C, D y E) se cambia solo con
// funciones puras de `src/logica/` aplicadas por `Guardado.cambiar`.
import { comprar, equipado, equipar, nuevosEscenarios, siguienteObjetivo } from "../logica/catalogo.ts";
import { actualizarRacha, medallaDe, medallaDePuntos, rachaDeHoy, registrarOficial, UMBRAL_BRONCE, UMBRAL_ORO, UMBRAL_PLATA, type Oficial } from "../logica/diarios.ts";
import { cobrarLibre, sumarEstadisticas, type LibreCobrada, type Medalla, type PartidaAcabada } from "../logica/economia.ts";
import { AVISO_ESPECIAL, especialDe, REGLAS_CON_ESPECIALES, type Especial } from "../logica/especiales.ts";
import { estrellasDe, nivelDisponible, nivelPorNumero, opcionesDeNivel, registrarNivel, textoMeta, textoObjetivo, totalEstrellas, ultimoDisponible, type NivelRegistrado } from "../logica/niveles.ts";
import { comprarObjeto, gastarObjeto, objetoPorId, objetosNuevos, pagarSeguir, pagosSeguir, REGALO_DESBLOQUEO, type PagoSeguir } from "../logica/objetos.ts";
import { cobrarObjetoVideo, cobrarVideoMonedas, corregirReloj, MONEDAS_VIDEO } from "../logica/recompensas.ts";
import { leerLibre, leerReto } from "../logica/reto.ts";
import { almacenDelNavegador } from "../logica/registro.ts";
import { deTramos, Guardado, type DiaJugado } from "../logica/progreso.ts";
import { generarSecuencia } from "../logica/piezas.ts";
import { VIDAS_INICIALES, VIDAS_MAX } from "../logica/puntuacion.ts";
import { codigoDeSemilla, codigoLibre, fechaDeDia, fechaUTC, numeroDia, semillaLibre } from "../logica/semilla.ts";
import type { Pieza } from "../logica/piezas.ts";
import type { Calidad } from "../logica/puntuacion.ts";
import { Partida, REGLAS, type Ayuda, type EstadoPartida, type Evento, type OpcionesPartida } from "../logica/simulacion.ts";
import { formatearAltura, formatearNumero, formatearPuntos, generarTarjeta, type DatosTarjeta } from "../logica/tarjeta.ts";
import { acreditarCompra, productoDisponible, productoPorId } from "../logica/tienda.ts";
import { Bucle, PASO_MS } from "./bucle.ts";
import { PanelTienda } from "./tienda.ts";
import { PanelNiveles } from "./mapa.ts";
import { Lienzo, NIVEL_AGUA, ratioDePantalla } from "./dibujo.ts";
import { Caidas, Efectos } from "./efectos.ts";
import { Haptica, puedeVibrar } from "./haptica.ts";
import { pintarMuestra } from "./muestras.ts";
import { Musica } from "./musica.ts";
import { Sonido } from "./sonido.ts";
import { abrir, aceptaEntrada, sinSalida, transicion, type Accion, type Flujo, type Modo, type Orden, type Panel, type Pantalla } from "./flujo.ts";
import { estadoDeInicio } from "./inicio.ts";
import { anunciosDePlataforma, aplicarLlamadas, llamadasAlAbrir, llamadasDeTransicion } from "./anuncios.ts";
import { anunciosDemo, pagosDemo, ponerBandaDemo } from "./demo.ts";
import { pagosDePlataforma } from "./pagos.ts";
import { compartir, descargar, ImagenCompartida, puedeCompartirArchivos } from "./compartir.ts";
import { formasParaImagen, type DatosImagen } from "./imagen.ts";
import { cambiarEstado, copiar, mostrarTexto, NOMBRE_MEDALLA, pintarBarraObjetos, pintarFin, pintarHud, pintarInicio, pintarInterruptor, pintarLibreAmigo, pintarPausa, pintarReto, pintarSeguir, ui, type DatosFin as DatosPantallaFin } from "./pantallas.ts";
import { PanelRetos } from "./retos.ts";
import { escenarioPorId, temaPorId } from "./temas.ts";

/**
 * Opciones de la partida libre y del reto diario; van en `data-opciones` para
 * reproducirla con `jugar` (G3). El modo decide si hay objetos y «seguir» (I1, R13).
 */
const OPCIONES_LIBRE: OpcionesPartida = { vidas: VIDAS_INICIALES, modo: "libre" };
const OPCIONES_RETO: OpcionesPartida = { vidas: VIDAS_INICIALES, modo: "reto" };
/** Pausa entre estrellas al acabar un nivel (E3). */
const ESTRELLA_MS = 380;
/** Lo que dura el aviso de la primera pieza especial de cada tipo (H3). */
const AVISO_ESPECIAL_MS = 2500;

/** Día de hoy en UTC. Se recalcula en cada acción y al volver a la pestaña. */
let hoy = numeroDia(fechaUTC(new Date()));
const almacen = almacenDelNavegador();
/**
 * Compilación de demostración (K3): `astro build --mode demo`. Se decide aquí,
 * en el nivel superior y con `import.meta.env.MODE`, para que la compilación
 * web descarte `demo.ts` entero (R14).
 */
const DEMO = import.meta.env.MODE === "demo";
/** Anuncios de esta compilación (G1, K2): en la web, ninguno (`anunciosNulos`); en la demo, vídeos de prueba. */
const anuncios = DEMO ? anunciosDemo() : anunciosDePlataforma(import.meta.env.PUBLIC_PLATAFORMA);
/** Pagos de esta compilación (K1): en la web, ninguno (`pagosNulos`); en la demo, simulados. */
const pagos = DEMO ? pagosDemo() : pagosDePlataforma(import.meta.env.PUBLIC_PLATAFORMA);
if (DEMO) ponerBandaDemo();
const reto = leerReto(location.search, hoy);
/** Partida libre del enlace de un amigo (F2); si hay reto, manda el reto. */
const libreAmigo = reto ? null : leerLibre(location.search);
/** Progreso guardado (C1): una sola clave; si el almacenamiento falla, queda en memoria. */
const guardado = new Guardado(almacen);
// Con el reloj del equipo atrasado, la espera de los vídeos no acabaría nunca (K2).
if (corregirReloj(guardado.actual, Date.now()) !== guardado.actual) guardado.cambiar((p) => corregirReloj(p, Date.now()));

const lienzo = new Lienzo(ui.lienzo(), ui.grano());
// Sonido, música y vibración (A4, D1): encendidos por defecto y guardados en `ajustes` (C1).
const sonido = new Sonido();
// La música va por su rama del mismo `AudioContext` (D1): un solo contexto en la página.
const musica = new Musica(() => sonido.paraMusica());
const haptica = new Haptica();
// Encender el sonido despierta el AudioContext, que no se crea hasta el primer gesto: solo se aplica si está apagado.
if (!guardado.actual.ajustes.sonido) sonido.cambiar(false);
if (!guardado.actual.ajustes.musica) {
  sonido.cambiarMusica(false);
  musica.cambiar(false);
}
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
/** Lo último escrito en `data-musica` y `data-notas`, para escribirlos solo cuando cambian. */
let musicaPintada = "";
/** Velocidad de la última pieza que colgó, para la capa de la música mientras la siguiente cae (D3). */
let velocidadMusica = 0;
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
/** Ayudas usadas en la partida en marcha, con su paso (I1): van en `data-ayudas` para repetirla con `jugar` (R3). */
let ayudas: Ayuda[] = [];
/** ¿Se ha ofrecido ya «¿Seguir?» en esta partida? Solo una vez (I3). */
let seguirOfrecido = false;
/** Lo último pintado en la barra de objetos, para repintarla solo cuando cambia. */
let barraPintada = "";
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
let temporizadorAviso = 0;
/** Momento en que se mostró el inicio, para el vaivén de su pieza (E2). */
let inicioDesde = performance.now();
/** ¿Se ha mostrado ya el inicio en esta página? Al volver a él se recuerda el objetivo cercano (Anexo B). */
let inicioVisto = false;
/** Botón que abrió el panel o la pausa: al cerrarlos, el foco vuelve a él. */
let abridor: HTMLElement | null = null;

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

/** Monedas, reto de hoy, niveles y objetivo cercano de la pantalla de inicio (E2). */
function pintarInicioActual(): void {
  const p = guardado.actual;
  const deHoy = resultadoDe(hoy);
  pintarInicio({
    monedas: p.monedas,
    racha: rachaDeHoy(p, hoy),
    hoy,
    jugadoHoy: deHoy ? { medalla: medallaDe(deHoy), puntos: deHoy.puntos } : null,
    nivel: ultimoDisponible(p),
    estrellas: totalEstrellas(p),
    siguiente: inicioVisto ? siguienteObjetivo(p) : null,
  });
}

/** Al abrir y al cambiar de día: gasta congeladores o corta la racha (D1). Solo guarda si cambia algo. */
function revisarRacha(): void {
  if (actualizarRacha(guardado.actual, hoy) !== guardado.actual) guardado.cambiar((p) => actualizarRacha(p, hoy));
  pintarInicioActual();
}

/** El día cambió con un reto oficial en marcha: la racha se revisa cuando acabe, ya guardado su día. */
let rachaPendiente = false;

/**
 * Al cambiar de día: revisa la racha, salvo con un reto oficial en marcha, que
 * aún puede alargarla (si se cortara antes, el reto de ayer sumaría desde 0).
 */
function revisarRachaAlCambiarDeDia(): void {
  const base = flujo.debajo ?? flujo.pantalla;
  if ((base === "jugando" || base === "pausa") && flujo.modo === "oficial") {
    rachaPendiente = true;
    return;
  }
  rachaPendiente = false;
  revisarRacha();
}

/** Lo que se muestra en el fin: una partida recién acabada o un día guardado. */
type DatosFin = {
  dia: number;
  puntos: number;
  altura: number;
  piezas: number;
  /** Piezas colocadas, de abajo arriba, para la imagen (F1), con su especial desde las reglas 3 (H3). */
  formas: Array<Pick<Pieza, "forma" | "ancho" | "alto" | "color"> & { especial?: Especial }>;
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
  const semilla = fechaDeDia(dia);
  const secuencia = indices.length > 0 ? generarSecuencia(semilla, indices[indices.length - 1]! + 1) : [];
  // Las especiales salen de la semilla desde las reglas 3 (H3, impacto §5); los días de antes no las tenían.
  const conEspeciales = jugado.reglas >= REGLAS_CON_ESPECIALES;
  const formas = indices
    .filter((i) => secuencia[i])
    .map((i) => {
      const especial = conEspeciales ? especialDe(semilla, i) : null;
      return especial ? { ...secuencia[i]!, especial } : secuencia[i]!;
    });
  // Desde la v2 hay perfectos; la v1 no los guardaba (R16: se mira la versión, no las reglas actuales).
  const conPerfectos = jugado.reglas >= 2;
  return { dia, puntos: jugado.puntos, altura: jugado.altura, piezas: jugado.piezas, formas, reglas: jugado.reglas, perfectos: conPerfectos ? jugado.perfectos : null, comboMax: null };
}

/** Aplica una acción de la interfaz: el flujo decide y aquí se ejecuta la orden. */
function actuar(accion: Accion): void {
  if (accion.tipo !== "terminar") {
    guardado.releer();
    if (actualizarHoy()) revisarRachaAlCambiarDeDia();
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
  else if (orden.tipo === "inicio") mostrarInicio();
  else if (orden.tipo === "pausa") mostrarPausa();
  else if (orden.tipo === "seguir") mostrarSeguir();
  else if (orden.tipo === "panel") mostrarPanel(orden.panel);
  else if (orden.tipo === "volver") volver(orden.pantalla);
}

function mostrarReto(): void {
  if (!reto && !libreAmigo) return;
  partida = null;
  escena = null;
  if (reto) {
    const jugado = resultadoDe(reto.dia);
    pintarReto({ hoy, reto, jugado: jugado !== null, puntosDia: jugado && jugado.reglas >= 2 ? jugado.puntos : null });
  } else if (libreAmigo) {
    pintarLibreAmigo(libreAmigo.puntos);
  }
  pintarHud({ puntos: 0, vidas: VIDAS_INICIALES, vidasMax: VIDAS_MAX, combo: 0, record: null });
  musica.poner("inicio");
  cambiarEstado("reto");
  lienzo.reservarArriba(0);
  lienzo.ponerRecord(null);
}

/**
 * Pantalla de inicio (E2): se deja la partida que hubiera y se ve el escenario
 * equipado con la pieza meciéndose. El foco va a «Jugar».
 */
function mostrarInicio(): void {
  partida = null;
  escena = null;
  pendiente = false;
  pararEstrellas();
  ocultarAvisoEspecial();
  ui.avisoToque().hidden = true;
  efectos.reiniciar();
  caidas.reiniciar();
  aplicarEquipado();
  lienzo.ponerRecord(null);
  lienzo.reiniciarCamara();
  lienzo.reservarArriba(0);
  inicioDesde = performance.now();
  // La música del inicio; en la primera visita no suena hasta el primer toque (autoplay, impacto §5).
  musica.poner("inicio");
  pintarInicioActual();
  inicioVisto = true;
  cambiarEstado("inicio");
  hudPintado = "";
  ui.botonJugar().focus();
}

/** Pausa (E3): la partida se queda quieta con su panel; en el reto diario, sin «Inicio» (R-3). */
function mostrarPausa(): void {
  pintarPausa({ titulo: tituloFin(flujo.modo, flujo.dia), sinSalida: sinSalida(flujo.modo) });
  ui.avisoToque().hidden = true;
  cambiarEstado("pausa");
  ui.botonSeguir().focus();
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

function empezar(modo: Modo, dia: number, numeroNivel: number = 0, codigo?: string): void {
  const nivel = modo === "nivel" ? nivelPorNumero(numeroNivel) : null;
  const semilla = nivel ? nivel.semilla : modo === "libre" ? semillaLibre(codigo) : fechaDeDia(dia);
  const opciones = nivel ? opcionesDeNivel(nivel) : modo === "libre" ? OPCIONES_LIBRE : OPCIONES_RETO;
  // Si el reto oficial anterior no llegó a acabar, la racha pendiente se revisa ahora.
  if (rachaPendiente) {
    rachaPendiente = false;
    revisarRacha();
  }
  partida = new Partida(semilla, opciones);
  partidasEmpezadas++;
  ui.juego().dataset.partidas = String(partidasEmpezadas);
  idPartida = `${semilla}#${partidasEmpezadas}.${codigoLibre()}`;
  diaEmpezada = hoy;
  pararEstrellas();
  escena = partida;
  pendiente = false;
  toques = [];
  ayudas = [];
  seguirOfrecido = false;
  barraPintada = "";
  soltadas = new Map();
  enCaida = null;
  mojadas = new WeakSet();
  recordCelebrado = false;
  efectos.reiniciar();
  caidas.reiniciar();
  // La de la partida entra al empezar el compás siguiente, o enseguida si no sonaba nada (D3).
  velocidadMusica = 0;
  musica.poner("partida");
  const juego = ui.juego();
  juego.dataset.modo = modo;
  juego.dataset.semilla = semilla;
  juego.dataset.opciones = JSON.stringify(opciones);
  juego.dataset.nivel = String(nivel?.numero ?? 0);
  juego.dataset.fase = partida.fase;
  delete juego.dataset.toques;
  delete juego.dataset.ayudas;
  delete juego.dataset.puntos;
  delete juego.dataset.altura;
  delete juego.dataset.victoria;
  delete juego.dataset.estrellas;
  ui.avisoToque().hidden = guardado.actual.ajustes.tutorialVisto;
  ocultarAvisoEspecial();
  delete juego.dataset.especial;
  aplicarEquipado();
  lienzo.ponerRecord(modo === "libre" ? guardado.actual.libre.alturaRecord : null);
  lienzo.reiniciarCamara();
  lienzo.reservarArriba(0);
  bucle.reiniciar();
  (document.activeElement as HTMLElement | null)?.blur();
  cambiarEstado("jugando");
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
    // La imagen pinta las especiales solo con reglas 3 o más (H3, impacto §5).
    formas: formasParaImagen(datos.formas, datos.reglas),
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

function mostrarFin(datos: DatosFin, modoPartida: Modo, premios: Premios = {}, objetoNuevo: string | null = null): void {
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
  // Objeto desbloqueado con esta partida, con su regalo (I3).
  mostrarTexto(ui.finObjeto(), objetoNuevo);
  const juego = ui.juego();
  juego.dataset.puntos = String(datos.puntos);
  juego.dataset.altura = String(datos.altura);
  cambiarEstado("fin");
  pintarInicioActual();
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
    // Las monedas de las doradas (H2) llegan al saldo por aquí; en los niveles no se cobran.
    doradas: r.doradas,
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
  const antes = guardado.releer();
  const premios = modo === "nivel" ? cobrarNivel(actual, flujo.nivel) : cobrar(actual, modo, dia);
  // «Nuevo objeto: Reloj de arena. Te regalamos 2» (I3).
  const nuevos = objetosNuevos(antes, guardado.actual);
  const objetoNuevo = nuevos.length > 0 ? nuevos.map((o) => `Nuevo objeto: ${o.nombre}. Te regalamos ${REGALO_DESBLOQUEO}.`).join(" ") : null;
  // Al acabar, el motivo de fin en el pulso siguiente; con un nivel ganado, la música calla y suena el récord (impacto §5).
  if (premios.nivel?.victoria) {
    musica.poner("silencio");
    sonido.record();
  } else {
    musica.poner("fin");
  }
  if (rachaPendiente) {
    rachaPendiente = false;
    revisarRacha();
  }
  ui.juego().dataset.toques = JSON.stringify(toques);
  ui.juego().dataset.ayudas = JSON.stringify(ayudas);
  // La última pieza caída sigue cayendo en pantalla aunque la partida ya la haya retirado.
  caidas.observar(actual.estado().cuerpos, 1, PASO_MS, performance.now());
  // En un nivel, la última pieza suma y acaba en el mismo paso: el HUD se pone al día antes de cerrar.
  actualizarHud();
  partida = null;
  actuar({ tipo: "terminar" });
  ui.contador().textContent = `${formatearPuntos(puntos)} · ${formatearAltura(altura)}`;
  hudPintado = "";
  mostrarFin({ dia, puntos, altura, piezas, formas, reglas: REGLAS, perfectos, comboMax }, modo, premios, objetoNuevo);
}

/**
 * Al perder la última vida en la libre (I3, impacto R-4): si hay con qué
 * pagar y no se ha ofrecido aún, «¿Seguir?» con la partida quieta. Devuelve
 * si se ha ofrecido; si no, la partida se cierra como siempre.
 */
function ofrecerSeguir(actual: Partida): boolean {
  if (seguirOfrecido || actual.resultado().victoria) return false;
  const pagos = pagosSeguir(guardado.releer(), { modo: flujo.modo, puntos: actual.estado().puntos, video: anuncios.disponible("recompensado") });
  if (pagos.length === 0) return false;
  seguirOfrecido = true;
  actuar({ tipo: "ofrecerSeguir" });
  return flujo.pantalla === "seguir";
}

function mostrarSeguir(): void {
  const actual = partida;
  if (!actual) return;
  const p = guardado.actual;
  const pagos = pagosSeguir(p, { modo: flujo.modo, puntos: actual.estado().puntos, video: anuncios.disponible("recompensado") });
  pintarSeguir({ puntos: actual.estado().puntos, corazones: p.objetos.corazon, precio: objetoPorId("corazon").precio, pagos });
  actualizarHud();
  ui.avisoToque().hidden = true;
  cambiarEstado("seguir");
  const primero = [ui.seguirCorazon(), ui.seguirMonedas(), ui.seguirVideo(), ui.seguirNo()].find((b) => !b.hidden);
  primero?.focus();
}

/** Paga y sigue (I3): la partida pone 1 vida y cuelga la siguiente pieza; el «seguir» va a `data-ayudas` (R3). */
function seguirCon(pago: PagoSeguir): void {
  const actual = partida;
  if (!actual || flujo.pantalla !== "seguir") return;
  if (pago !== "video" && pagarSeguir(guardado.releer(), pago) === guardado.actual) return;
  const paso = actual.pasos;
  if (!actual.seguir()) return;
  if (pago !== "video") guardado.cambiar((p) => pagarSeguir(p, pago));
  ayudas.push({ paso, tipo: "seguir" });
  hudPintado = "";
  barraPintada = "";
  actuar({ tipo: "seguirTrasPerder" });
}

/** «No, ver resultado»: la partida acaba sin gastar nada. */
function noSeguir(): void {
  if (partida && flujo.pantalla === "seguir") terminar(partida);
}

/**
 * Usa un objeto de la barra con la pieza colgando (I3): lo gasta, lo guarda y
 * lo anota en `data-ayudas` con su paso (R3). Con 0, abre la Tienda (pestaña
 * Objetos) encima de la partida, que queda quieta (impacto R-6).
 */
function usarObjeto(objeto: "reloj" | "cemento"): void {
  const actual = partida;
  if (!actual || flujo.pantalla !== "jugando") return;
  if (guardado.releer().objetos[objeto] <= 0) {
    actuar({ tipo: "abrir", panel: "tienda" });
    return;
  }
  const paso = actual.pasos;
  if (!actual.usar(objeto)) return;
  ayudas.push({ paso, tipo: objeto });
  guardado.cambiar((p) => gastarObjeto(p, objeto));
  sonido.tic();
  // Sin foco en el botón: Espacio vuelve a soltar la pieza.
  (document.activeElement as HTMLElement | null)?.blur();
  actualizarBarra(actual);
}

/** Barra de objetos (I3): en la libre y en los niveles; los botones, activos solo con la pieza colgando. */
function actualizarBarra(actual: Partida): void {
  const p = guardado.actual;
  const visible = flujo.modo === "libre" || flujo.modo === "nivel";
  const apuntando = actual.fase === "apuntando";
  const clave = `${visible}|${apuntando}|${p.objetos.reloj}|${p.objetos.cemento}|${p.objetos.desbloqueados.join()}`;
  if (clave === barraPintada) return;
  barraPintada = clave;
  const de = (objeto: "reloj" | "cemento") => ({ desbloqueado: p.objetos.desbloqueados.includes(objeto), cuantos: p.objetos[objeto], activo: apuntando });
  pintarBarraObjetos(visible, { reloj: de("reloj"), cemento: de("cemento") });
}

/** Abre Retos, Niveles, Tienda o Ajustes encima de la pantalla que hubiera (si era una partida, queda en pausa). */
function mostrarPanel(panel: Panel): void {
  abridor = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
  cambiarEstado(panel, flujo.debajo);
  ui.avisoToque().hidden = true;
  if (panel === "retos") panelRetos.abrir();
  else if (panel === "niveles") panelNiveles.abrir();
  else if (panel === "tienda") panelTienda.abrir(guardado.actual);
  else pintarAjustes();
  pintarInicioActual();
}

/** Cierra el panel o la pausa y vuelve a la pantalla de debajo; la partida en pausa sigue sin saltos. */
function volver(pantalla: Exclude<Pantalla, Panel>): void {
  cambiarEstado(pantalla);
  const anterior = abridor;
  abridor = null;
  if (pantalla === "jugando") {
    bucle.reiniciar();
    ui.avisoToque().hidden = guardado.actual.ajustes.tutorialVisto;
    // Sin foco en ningún botón: Espacio vuelve a soltar la pieza.
    (document.activeElement as HTMLElement | null)?.blur();
    return;
  }
  // El foco vuelve al botón que abrió el panel, si se sigue viendo.
  if (anterior?.isConnected && anterior.checkVisibility()) anterior.focus();
  if (pantalla === "inicio") {
    pintarInicioActual();
  } else if (pantalla === "fin") {
    if (modoFin === "libre") mostrarTexto(ui.finSiguiente(), siguienteObjetivo(guardado.actual));
    reservarTarjeta();
  }
}

/** Tras comprar o equipar: se guarda, se aplica al lienzo y se repintan barra y panel. */
function cambiarTienda(cambio: (p: typeof guardado.actual) => typeof guardado.actual, mensaje: string): void {
  guardado.cambiar(cambio);
  aplicarEquipado();
  pintarInicioActual();
  ui.mensajeTienda().textContent = mensaje;
  if (flujo.pantalla === "tienda") panelTienda.pintar(guardado.actual);
  if (flujo.pantalla === "retos") panelRetos.pintar();
}

const panelNiveles = new PanelNiveles({ jugar: (nivel) => actuar({ tipo: "jugarNivel", nivel }) }, () => guardado.actual);

const panelTienda = new PanelTienda(
  {
    // Comprar un tema lo pone al momento: se ve lo que se ha ganado.
    comprar: (id) => {
      const puede = comprar(guardado.releer(), id) !== guardado.actual;
      cambiarTienda((p) => {
        const comprado = comprar(p, id);
        return comprado === p ? p : equipar(comprado, id);
      }, puede ? `Tema ${temaPorId(id).nombre} comprado y puesto` : "");
    },
    equipar: (id) => cambiarTienda((p) => equipar(p, id), ""),
    comprarObjeto: (id) => {
      const puede = comprarObjeto(guardado.releer(), id) !== guardado.actual;
      cambiarTienda((p) => comprarObjeto(p, id), puede ? `${objetoPorId(id).nombre}: tienes ${guardado.actual.objetos[id] + 1}` : "");
    },
    // Vídeos (K2): el premio solo con «visto»; con «cancelado» o «error», nada y el botón sigue.
    verVideoMonedas: () => {
      void anuncios.recompensado("monedas").then((resultado) => {
        if (resultado !== "visto") return cambiarTienda((p) => p, "Sin vídeo completo no hay premio");
        cambiarTienda((p) => cobrarVideoMonedas(p, Date.now()), `+${MONEDAS_VIDEO} monedas`);
      });
    },
    verVideoObjeto: (id) => {
      void anuncios.recompensado("objeto").then((resultado) => {
        if (resultado !== "visto") return cambiarTienda((p) => p, "Sin vídeo completo no hay premio");
        cambiarTienda((p) => cobrarObjetoVideo(p, Date.now(), id), `${objetoPorId(id).nombre}: tienes ${guardado.releer().objetos[id] + 1}`);
      });
    },
    // Pagos (K1): solo con «pagado» se acredita, una vez por transacción.
    pagar: (id) => {
      if (!productoDisponible(guardado.releer(), id)) return;
      void pagos.comprar(id).then((resultado) => {
        if (resultado.estado === "pagado") {
          const { monedas } = productoPorId(id);
          cambiarTienda((p) => acreditarCompra(p, id, resultado.transaccion, Date.now()), monedas > 0 ? `+${formatearNumero(monedas)} monedas` : "Pack de ayudas añadido");
        } else {
          cambiarTienda((p) => p, resultado.estado === "pendiente" ? "Pago pendiente de confirmar" : "No se ha cobrado nada");
        }
      });
    },
  },
  () => guardado.actual,
  () => ({ productos: pagos.disponible() ? pagos.productos() : [], video: anuncios.disponible("recompensado"), ahora: Date.now() }),
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
    comprarCongelador: () => cambiarTienda((p) => comprar(p, "congelador"), ""),
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
  // En la pausa o con un panel abierto encima, la partida queda quieta.
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
      if (!ofrecerSeguir(actual)) terminar(actual);
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
  // Velocidad de la pieza que cuelga (B1, reglas 3): la calcula la partida con el ritmo.
  juego.dataset.velocidad = colgada ? String(colgada.velocidad) : "";
  // La capa de la música sigue al combo, la altura y la velocidad (D3); cambia al empezar el compás.
  if (colgada) velocidadMusica = colgada.velocidad;
  musica.pedirCapa({ combo: estado.combo, altura: estado.altura, velocidad: velocidadMusica });
  juego.dataset.pasos = String(actual.pasos);
  // Especial de la pieza que cuelga (H3), para las pruebas; la primera de cada tipo, con aviso.
  if (colgada?.especial) {
    juego.dataset.especial = colgada.especial;
    avisarEspecial(colgada.especial);
  } else {
    delete juego.dataset.especial;
  }
  if (pasos > 0) observar(estado, pasos);
  actualizarHud();
  actualizarBarra(actual);
  pintarEfectos();
}

/**
 * La primera vez que cuelga cada tipo de especial en este navegador, un aviso
 * de 2,5 s que no para la partida (H3). Se guarda en `vistos`; si el
 * almacenamiento falla, se recuerda solo en memoria.
 */
function avisarEspecial(especial: Especial): void {
  if (guardado.actual.vistos.includes(especial)) return;
  guardado.cambiar((p) => (p.vistos.includes(especial) ? p : { ...p, vistos: [...p.vistos, especial] }));
  const aviso = ui.avisoEspecial();
  aviso.textContent = AVISO_ESPECIAL[especial];
  aviso.dataset.especial = especial;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = window.setTimeout(ocultarAvisoEspecial, AVISO_ESPECIAL_MS);
}

function ocultarAvisoEspecial(): void {
  clearTimeout(temporizadorAviso);
  ui.avisoEspecial().hidden = true;
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
      musica.caida();
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
    } else if (evento.tipo === "especial") {
      const pieza = soltadas.get(evento.indice);
      const cuerpo = pieza && estado.cuerpos.find((c) => c.pieza === pieza);
      if (pieza && cuerpo) efectos.especial(evento.especial, pieza, cuerpo.x, cuerpo.y, ahora);
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

/**
 * Música en cada fotograma (D1): se para en la pausa o con un panel sobre la
 * partida, y programa las notas de los próximos 0,2 s. `data-musica` (pista y
 * capa) y `data-notas` (notas programadas) son para las pruebas. Con
 * `window.__costeMusica`, que solo pone la prueba de rendimiento, se anota lo
 * que tarda cada vuelta (D4).
 */
function sonarMusica(): void {
  musica.pausar(partida !== null && flujo.pantalla !== "jugando");
  const coste = (window as { __costeMusica?: number[] }).__costeMusica;
  if (coste) {
    const desde = performance.now();
    musica.programar();
    coste.push(performance.now() - desde);
  } else {
    musica.programar();
  }
  const pintada = `${musica.etiqueta}|${musica.notas}`;
  if (pintada === musicaPintada) return;
  musicaPintada = pintada;
  const juego = ui.juego();
  juego.dataset.musica = musica.etiqueta;
  juego.dataset.notas = String(musica.notas);
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


/** En el inicio (y con un panel abierto encima), la pieza que se mece; si no, nada. */
function escenaInicio(ahora: number): EstadoPartida | null {
  if (flujo.pantalla !== "inicio" && flujo.debajo !== "inicio") return null;
  return estadoDeInicio((ahora - inicioDesde) / 1000, lienzo.metrosVisibles);
}

const bucle = new Bucle(avanzar, () => {
  const ahora = performance.now();
  const sueltas = caidas.avanzar(ahora, ahora - ultimoFotograma);
  ultimoFotograma = ahora;
  lienzo.dibujar(escena?.estado() ?? escenaInicio(ahora), ahora, sueltas);
  pintarEfectos();
  sonarMusica();
});

/** ¿Tiene el foco un control que ya responde a Espacio e Intro por sí mismo? */
function focoEnControl(): boolean {
  const activo = document.activeElement;
  return activo instanceof HTMLButtonElement || activo instanceof HTMLAnchorElement || activo instanceof HTMLInputElement;
}

// El AudioContext se crea o se reanuda en el primer gesto, nunca antes (A4).
document.addEventListener("pointerdown", () => sonido.despertar(), { capture: true });
document.addEventListener("keydown", () => sonido.despertar(), { capture: true });

/** Ajustes (C2): Música, Sonidos y Vibración (si el navegador vibra), créditos y la versión de las reglas. */
function pintarAjustes(): void {
  pintarInterruptor(ui.ajusteMusica(), musica.activa);
  pintarInterruptor(ui.ajusteSonidos(), sonido.activo);
  pintarInterruptor(ui.ajusteVibracion(), haptica.activa);
  ui.ajusteVibracion().hidden = !puedeVibrar();
}
ui.ajustesVersion().textContent = `Torre Diaria · reglas ${REGLAS}`;
ui.ajusteMusica().addEventListener("click", () => {
  const activa = !musica.activa;
  musica.cambiar(activa);
  sonido.cambiarMusica(activa);
  guardado.cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, musica: activa } }));
  pintarAjustes();
});
ui.ajusteSonidos().addEventListener("click", () => {
  sonido.cambiar(!sonido.activo);
  const activo = sonido.activo;
  guardado.cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, sonido: activo } }));
  pintarAjustes();
});
ui.ajusteVibracion().addEventListener("click", () => {
  haptica.cambiar(!haptica.activa);
  const activa = haptica.activa;
  guardado.cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, vibracion: activa } }));
  pintarAjustes();
});
ui.botonCreditos().addEventListener("click", () => {
  const abiertos = ui.creditos().hidden;
  ui.creditos().hidden = !abiertos;
  ui.botonCreditos().setAttribute("aria-expanded", String(abiertos));
});

ui.zona().addEventListener("pointerdown", (evento) => {
  if (flujo.pantalla !== "jugando") return;
  // Los botones de la zona (la pausa) no sueltan la pieza.
  if (evento.target instanceof Element && evento.target.closest("button")) return;
  evento.preventDefault();
  pedirSoltar();
});
/** ¿Es un panel que se abre encima de otra pantalla? */
function esPanel(pantalla: Pantalla): pantalla is Panel {
  return pantalla === "retos" || pantalla === "niveles" || pantalla === "tienda" || pantalla === "ajustes";
}

document.addEventListener("keydown", (evento) => {
  // Escape cierra los paneles y la pausa; durante la partida, como P, la pausa (E3).
  const pausaConP = (evento.key === "p" || evento.key === "P") && !evento.ctrlKey && !evento.metaKey && !evento.altKey;
  if (evento.key === "Escape" || pausaConP) {
    if (evento.repeat) return;
    // Con la ventana de un nivel abierta, Escape la cierra a ella sola y el mapa sigue (F1).
    if (evento.key === "Escape" && panelNiveles.ventanaAbierta()) {
      evento.preventDefault();
      panelNiveles.cerrarVentana();
      return;
    }
    if (evento.key === "Escape" && esPanel(flujo.pantalla)) actuar({ tipo: "cerrar" });
    else if (flujo.pantalla === "pausa") actuar({ tipo: "seguirPartida" });
    else if (flujo.pantalla === "jugando") actuar({ tipo: "pausar" });
    return;
  }
  if (evento.repeat || !(evento.code === "Space" || evento.key === " " || evento.key === "Enter")) return;
  if (flujo.pantalla === "jugando") {
    // Con el foco en un botón (la pausa, con Tab), la tecla es suya y no suelta la pieza.
    if (focoEnControl()) return;
    evento.preventDefault();
    pedirSoltar();
  } else if (flujo.pantalla === "inicio" && !focoEnControl()) {
    // En el inicio, Espacio o Intro equivalen a «Jugar». Con el foco en «Jugar», lo pulsa el propio botón (E2).
    evento.preventDefault();
    actuar({ tipo: "libre" });
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
ui.botonInicio().addEventListener("click", () => actuar({ tipo: "inicio" }));
// Inicio (E2): «Jugar», las tarjetas, la ficha de monedas y la rueda de Ajustes.
ui.botonJugar().addEventListener("click", () => actuar({ tipo: "libre" }));
ui.tarjetaReto().addEventListener("click", () => actuar({ tipo: "abrir", panel: "retos" }));
ui.tarjetaNiveles().addEventListener("click", () => actuar({ tipo: "abrir", panel: "niveles" }));
ui.tarjetaTienda().addEventListener("click", () => actuar({ tipo: "abrir", panel: "tienda" }));
ui.inicioMonedas().addEventListener("click", () => actuar({ tipo: "abrir", panel: "tienda" }));
ui.inicioAjustes().addEventListener("click", () => actuar({ tipo: "abrir", panel: "ajustes" }));
// Pausa (E3).
ui.botonPausa().addEventListener("click", () => actuar({ tipo: "pausar" }));
ui.botonSeguir().addEventListener("click", () => actuar({ tipo: "seguirPartida" }));
ui.pausaAjustes().addEventListener("click", () => actuar({ tipo: "abrir", panel: "ajustes" }));
ui.pausaInicio().addEventListener("click", () => actuar({ tipo: "inicio" }));
// Objetos (I3): la barra de la partida y «¿Seguir?».
ui.objetoReloj().addEventListener("click", () => usarObjeto("reloj"));
ui.objetoCemento().addEventListener("click", () => usarObjeto("cemento"));
ui.seguirCorazon().addEventListener("click", () => seguirCon("corazon"));
ui.seguirMonedas().addEventListener("click", () => seguirCon("monedas"));
ui.seguirVideo().addEventListener("click", () => {
  void anuncios.recompensado("seguir").then((resultado) => {
    if (resultado === "visto") seguirCon("video");
  });
});
ui.seguirNo().addEventListener("click", noSeguir);
ui.botonCerrarRetos().addEventListener("click", () => actuar({ tipo: "cerrar" }));
ui.botonCerrarNiveles().addEventListener("click", () => actuar({ tipo: "cerrar" }));
ui.botonCerrarTienda().addEventListener("click", () => actuar({ tipo: "cerrar" }));
ui.botonCerrarAjustes().addEventListener("click", () => actuar({ tipo: "cerrar" }));
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
  cambiarTienda((p) => equipar(p, id), "");
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
  musica.ocultar(document.hidden);
  // Al ocultar la pestaña, la partida queda en pausa con su panel: al volver no sigue sola (E3, T29).
  if (document.hidden && flujo.pantalla === "jugando") actuar({ tipo: "pausar" });
  if (document.visibilityState !== "visible") return;
  guardado.releer();
  if (!actualizarHoy()) return;
  revisarRachaAlCambiarDeDia();
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
/**
 * Lo que tapa abajo la barra de objetos, para que el muelle quede encima (I3).
 * Oculta con `hidden`, nada; oculta solo por la pantalla (pausa, «¿Seguir?»,
 * fin), se queda lo de antes y la cámara no se mueve bajo el panel. El fin ya
 * no la cuenta (`Lienzo`) y `reiniciarCamara` la olvida.
 */
function reservarBarra(): void {
  const barra = ui.barraObjetos();
  const caja = barra.getBoundingClientRect();
  if (barra.hidden) lienzo.reservarAbajo(0);
  else if (caja.height > 0) lienzo.reservarAbajo(ui.lienzo().getBoundingClientRect().bottom - caja.top);
}
const observador = new ResizeObserver(() => {
  ajustarLienzo();
  reservarBarra();
  if (flujo.pantalla === "fin") reservarTarjeta();
});
observador.observe(ui.lienzo());
observador.observe(ui.hud());
observador.observe(ui.barraObjetos());
aplicarEquipado();
revisarRacha();
const apertura = abrir(reto, hoy, libreAmigo);
flujo = apertura.flujo;
if (flujo.pantalla === "inicio") mostrarInicio();
aplicarLlamadas(anuncios, llamadasAlAbrir(apertura.orden), () => ejecutar(apertura.orden));
ajustarLienzo();
bucle.iniciar();
