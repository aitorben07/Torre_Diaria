// Dibujo procedural en <canvas> con la dirección de arte «Riso» (A2, Anexo 1,
// 1.3 y 1.4): piezas de tinta plana con contorno, sombra de impresión
// desplazada, color algo fuera de registro y trama de puntos; escenario (puerto,
// ciudad o nubes, C3) con capas en paralaje, cielo que oscurece con la altura y
// grano de papel. Todo lo caro
// (degradado, tramas, capas, grano y la imagen de cada pieza) se crea al
// ajustar o la primera vez que hace falta, no por fotograma; el fondo se
// repinta solo cuando se mueve la cámara. El grano va en un elemento encima del
// lienzo, así que no cuesta nada por fotograma. Solo lee el estado de la
// partida: no cambia puntos ni pasos.
import type { Especial } from "../logica/especiales.ts";
import { ALTO_MAX, verticesPieza, type Pieza } from "../logica/piezas.ts";
import {
  HUECO_COLGADA,
  PLATAFORMA_MEDIO_ANCHO,
  type CuerpoVisible,
  type EstadoPartida,
} from "../logica/simulacion.ts";
import { crearAzarVisual, entreVisual } from "./efectos.ts";
import { COLORES, ESCENARIO_PUERTO, ESPECIALES_DIBUJO, FAMILIA, TEMA_RISO, mezclar, oscurecer, type Escenario, type Tema } from "./temas.ts";

/** Metros visibles a lo ancho de la columna de juego y a lo alto: el ancho cubre todo el vaivén. */
export const ANCHO_VISTA = 9.2;
export const ALTO_VISTA = 13;
/** Metros de suelo visibles por debajo de la cara de la plataforma: el muelle queda por encima de la barra de abajo. */
export const MARGEN_SUELO = 2.1;
/** Metros sobre la cima de la torre que deben verse: el hueco, la pieza que cuelga y un margen. */
export const ESPACIO_SOBRE_CIMA = HUECO_COLGADA + ALTO_MAX + 0.8;
/** Con la tarjeta de fin, la cima queda a estos metros por debajo de su borde inferior. */
export const MARGEN_BAJO_TARJETA = 0.6;
/** Si bajo la tarjeta quedan menos metros que estos, se ignora la tarjeta. */
const LIBRE_MINIMO = 2;
export const RATIO_MAXIMO = 2;
/**
 * En pantallas táctiles, como mucho 1,25. Con 2, el p95 de fotograma del móvil
 * con CPU ×4 daba 35 ms (objetivo ≤ 33 ms, impacto A2) y se bajó a 1,5; con la
 * música de la v3, 1,5 volvió a dar de 32 a 34 ms. El perfil (L4) muestra que
 * el coste está repartido en el pintado del lienzo por software, no en un
 * efecto concreto; con 1,25 da de 29 a 31 ms (`mediciones.md`, L4).
 */
export const RATIO_MAXIMO_TACTIL = 1.25;

/** Superficie del mar, en metros bajo la cara del muelle. */
export const NIVEL_AGUA = -0.75;
/** Alejamiento de la cámara (Anexo 1, 1.4): desde 20 m, hasta un 10 %. */
export const ZOOM_DESDE = 20;
export const ZOOM_ALEJAMIENTO = 0.1;
/** En el fin la cámara se aleja hasta ver la torre entera, pero no más que esto. */
export const ZOOM_FIN_MIN = 0.35;

/** Medidas del estilo, en metros (Anexo 1, 1.3). */
const CONTORNO = 0.035;
const SOMBRA_X = 0.06;
const SOMBRA_Y = -0.06;
/** Desajuste de registro: la tinta de color se imprime un poco desplazada del contorno. */
const REGISTRO_X = -0.022;
const REGISTRO_Y = 0.016;
const REDONDEO = 0.08;
const RADIO_OJO = 0.075;
const SUSTO = (10 * Math.PI) / 180;
const INCLINACION_GANCHO = (4 * Math.PI) / 180;
const SEPARACION_TRAMA = 0.1;
/** Margen alrededor de la imagen de cada pieza, para el contorno y el registro. */
const MARGEN_IMAGEN = 0.06;
/** Lado en píxeles reales de la tesela de grano. */
const LADO_GRANO = 192;
/** Altura del cielo que cubre el degradado; por encima, el último color. */
const ALTURA_CIELO = 110;
/** Rayas de la línea de récord, en metros (C2). */
const RAYA_RECORD = 0.22;

/**
 * Altura de la cámara en metros: con 0, la cara de la plataforma queda
 * `MARGEN_SUELO` por encima del borde inferior. La cámara sigue a la torre:
 * sube en cuanto la cima y la pieza que cuelga dejan de caber, así que la torre
 * llena la vista en vez de quedarse abajo. Con `reservaArriba` (metros tapados
 * por la tarjeta de fin), si la cima quedaría debajo de la tarjeta, la cámara
 * sube lo justo para dejarla bajo su borde.
 */
export function objetivoCamara(altura: number, altoVisible: number, reservaArriba: number = 0): number {
  const enJuego = Math.max(0, altura + MARGEN_SUELO + ESPACIO_SOBRE_CIMA - altoVisible);
  const libre = altoVisible - reservaArriba;
  if (reservaArriba <= 0 || libre < LIBRE_MINIMO) return enJuego;
  return Math.max(enJuego, altura + MARGEN_SUELO - (libre - MARGEN_BAJO_TARJETA));
}

/**
 * Zoom de la cámara (1 = sin alejar). Jugando, se aleja poco a poco desde
 * `ZOOM_DESDE` metros hasta `ZOOM_ALEJAMIENTO`. En el fin, lo justo para que la
 * torre entera quepa bajo la tarjeta (`libre` metros), sin bajar de `ZOOM_FIN_MIN`.
 */
export function zoomObjetivo(altura: number, enFin: boolean, libre: number): number {
  const jugando = 1 - Math.min(ZOOM_ALEJAMIENTO, Math.max(0, (altura - ZOOM_DESDE) / 100));
  if (!enFin || libre < LIBRE_MINIMO) return jugando;
  const necesario = altura + MARGEN_SUELO + MARGEN_BAJO_TARJETA;
  return Math.max(ZOOM_FIN_MIN, Math.min(jugando, libre / necesario));
}

/** ¿Cae la pieza dentro de la franja visible `[abajo, arriba]` (en metros)? Se mira su caja girada. */
export function enVista(cuerpo: Pick<CuerpoVisible, "y"> & { pieza: Pick<Pieza, "ancho" | "alto"> }, abajo: number, arriba: number): boolean {
  const radio = Math.hypot(cuerpo.pieza.ancho, cuerpo.pieza.alto) / 2 + Math.abs(SOMBRA_Y);
  return cuerpo.y + radio >= abajo && cuerpo.y - radio <= arriba;
}

/**
 * Fila en píxeles reales de una altura en metros, con la cara de la plataforma
 * en la fila `sueloY` y `k` píxeles por metro. La usa la línea de récord (C2).
 */
export function alturaEnPantalla(metros: number, sueloY: number, k: number): number {
  return sueloY - metros * k;
}

export function ratioPixeles(dispositivo: number, tactil: boolean = false): number {
  return Math.min(dispositivo > 0 ? dispositivo : 1, tactil ? RATIO_MAXIMO_TACTIL : RATIO_MAXIMO);
}

/** Consulta del puntero, creada una vez: `ratioDePantalla` se llama varias veces por fotograma. */
let punteroGrueso: MediaQueryList | null | undefined;

/**
 * ¿Se juega con el dedo? (puntero principal grueso: móvil o tableta). La
 * consulta se crea la primera vez y se reutiliza (L4: crear una en cada
 * fotograma salía en el perfil del móvil con CPU ×4); `matches` sigue al
 * puntero si cambia.
 */
export function esTactil(): boolean {
  if (typeof window === "undefined") return false;
  if (punteroGrueso === undefined) punteroGrueso = window.matchMedia?.("(pointer: coarse)") ?? null;
  return punteroGrueso?.matches === true;
}

/** Píxeles reales por píxel CSS del lienzo en esta pantalla. */
export function ratioDePantalla(): number {
  return ratioPixeles(window.devicePixelRatio, esTactil());
}

/** Contorno de la pieza con las esquinas redondeadas (solo visual), en metros. */
export function rutaPieza(pieza: Pick<Pieza, "forma" | "ancho" | "alto">): Path2D {
  const v = verticesPieza(pieza);
  const radio = REDONDEO * Math.min(pieza.ancho, pieza.alto);
  const ruta = new Path2D();
  const ultimo = v[v.length - 1]!;
  ruta.moveTo((ultimo.x + v[0]!.x) / 2, (ultimo.y + v[0]!.y) / 2);
  for (let i = 0; i < v.length; i++) {
    const esquina = v[i]!;
    const siguiente = v[(i + 1) % v.length]!;
    ruta.arcTo(esquina.x, esquina.y, siguiente.x, siguiente.y, radio);
  }
  ruta.closePath();
  return ruta;
}

/** Margen de la imagen de una especial: la miel de la pegajosa cuelga por debajo. */
export const MARGEN_ESPECIAL = 0.22;

/**
 * Adornos de una pieza especial sobre su color (H3, Anexo G), en metros, con
 * el centro de la pieza en el origen y la y hacia arriba, como en el mundo. Los
 * usan el lienzo y la imagen de compartir. Dorada: brillo en diagonal y una
 * estrella en la trama. Pegajosa: miel en el borde de abajo que gotea. Cemento:
 * franja amarilla arriba y un saco dibujado.
 */
export function pintarAdornoEspecial(c: CanvasRenderingContext2D, pieza: Pick<Pieza, "forma" | "ancho" | "alto">, especial: Especial, ruta: Path2D): void {
  const { adorno } = ESPECIALES_DIBUJO[especial];
  const w = pieza.ancho / 2;
  const h = pieza.alto / 2;
  const lado = Math.min(pieza.ancho, pieza.alto);
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  if (especial === "dorada") {
    c.save();
    c.clip(ruta);
    c.globalAlpha = 0.7;
    c.fillStyle = adorno;
    c.beginPath();
    for (const [desde, ancho] of [[-0.42, 0.16], [-0.16, 0.06]] as const) {
      c.moveTo(w * desde - h, -h);
      c.lineTo(w * desde - h + ancho, -h);
      c.lineTo(w * desde + h + ancho, h);
      c.lineTo(w * desde + h, h);
    }
    c.fill();
    c.restore();
    // Abajo a la derecha, lejos de los ojos, que van sobre el centro.
    estrellaEspecial(c, w * 0.6, -h * 0.38, Math.min(0.13, lado * 0.28), adorno);
  } else if (especial === "pegajosa") {
    const goteo = Math.min(0.18, pieza.alto * 0.5);
    c.fillStyle = adorno;
    c.save();
    c.clip(ruta);
    c.fillRect(-w, -h, pieza.ancho, Math.min(0.12, pieza.alto * 0.3));
    c.restore();
    // Gotas que cuelgan del borde, siempre las mismas para cada pieza.
    const gotas = Math.max(2, Math.round(pieza.ancho / 0.32));
    c.strokeStyle = COLORES.tinta;
    c.lineWidth = CONTORNO * 0.7;
    for (let i = 0; i < gotas; i++) {
      const x = -w + (pieza.ancho * (i + 0.5)) / gotas;
      const largo = goteo * (i % 2 === 0 ? 1 : 0.6);
      const r = Math.min(0.07, pieza.ancho / gotas / 3);
      c.beginPath();
      c.moveTo(x - r, -h + 0.02);
      c.lineTo(x - r * 0.8, -h - largo);
      c.arc(x, -h - largo, r * 0.95, Math.PI, 0, true);
      c.lineTo(x + r, -h + 0.02);
      c.closePath();
      c.fill();
      c.stroke();
    }
  } else {
    const franja = Math.min(0.1, pieza.alto * 0.22);
    c.save();
    c.clip(ruta);
    c.fillStyle = COLORES.amarillo;
    c.fillRect(-w, h - franja * 1.6, pieza.ancho, franja);
    c.strokeStyle = COLORES.tinta;
    c.lineWidth = CONTORNO * 0.6;
    c.beginPath();
    for (let x = -w; x < w; x += franja * 1.2) {
      c.moveTo(x, h - franja * 0.6);
      c.lineTo(x + franja, h - franja * 1.6);
    }
    c.stroke();
    c.restore();
    // Saco de cemento, abajo a la izquierda: rectángulo con la boca atada.
    const ancho = Math.min(0.34, pieza.ancho * 0.34);
    const alto = Math.min(0.3, pieza.alto * 0.42);
    const x = -w * 0.5 - ancho / 2;
    const y = -h + Math.min(0.06, pieza.alto * 0.12);
    c.fillStyle = adorno;
    c.strokeStyle = COLORES.tinta;
    c.lineWidth = CONTORNO * 0.8;
    c.beginPath();
    c.roundRect(x, y, ancho, alto, Math.min(ancho, alto) * 0.25);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(x + ancho * 0.3, y + alto);
    c.lineTo(x + ancho * 0.5, y + alto * 0.82);
    c.lineTo(x + ancho * 0.7, y + alto);
    c.moveTo(x + ancho * 0.2, y + alto * 0.45);
    c.lineTo(x + ancho * 0.8, y + alto * 0.45);
    c.stroke();
  }
  c.restore();
}

/** Estrella de cinco puntas con contorno de tinta, en metros. */
function estrellaEspecial(c: CanvasRenderingContext2D, x: number, y: number, radio: number, relleno: string): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angulo = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radio : radio * 0.45;
    c.lineTo(x + Math.cos(angulo) * r, y + Math.sin(angulo) * r);
  }
  c.closePath();
  c.fillStyle = relleno;
  c.fill();
  c.strokeStyle = COLORES.tinta;
  c.lineWidth = CONTORNO * 0.7;
  c.stroke();
}

/**
 * Ojos de una especial (Anexo G), en metros como los adornos: la dorada con
 * pestañas, la pegajosa entornados y la de cemento serios, con cejas rectas.
 * Salen en todas las formas, para que se distinga ya en el gancho.
 */
export function pintarOjosEspecial(c: CanvasRenderingContext2D, pieza: Pick<Pieza, "ancho" | "alto">, especial: Especial): void {
  const separacion = Math.min(0.2, pieza.ancho * 0.2);
  const radio = Math.min(RADIO_OJO, pieza.alto * 0.18);
  const y = Math.min(pieza.alto * 0.12, 0.1);
  c.save();
  c.lineCap = "round";
  c.strokeStyle = COLORES.tinta;
  for (const lado of [-1, 1]) {
    const ox = lado * separacion;
    c.fillStyle = COLORES.tinta;
    if (especial === "pegajosa") {
      // Entornados: medio ojo bajo un párpado recto.
      c.beginPath();
      c.arc(ox, y, radio, Math.PI, 0, true);
      c.closePath();
      c.fill();
      c.lineWidth = 0.035;
      c.beginPath();
      c.moveTo(ox - radio * 1.3, y + 0.005);
      c.lineTo(ox + radio * 1.3, y + 0.005);
      c.stroke();
      continue;
    }
    c.beginPath();
    c.arc(ox, y, radio, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = COLORES.papel;
    c.beginPath();
    c.arc(ox + radio * 0.35, y + radio * 0.35, radio * 0.32, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 0.025;
    c.beginPath();
    if (especial === "dorada") {
      // Tres pestañas hacia fuera.
      for (const giro of [-0.5, 0, 0.5]) {
        const angulo = Math.PI / 2 + giro * lado - lado * 0.25;
        c.moveTo(ox + Math.cos(angulo) * radio * 1.1, y + Math.sin(angulo) * radio * 1.1);
        c.lineTo(ox + Math.cos(angulo) * radio * 1.75, y + Math.sin(angulo) * radio * 1.75);
      }
    } else {
      // Ceja recta, algo caída hacia dentro: cara seria.
      c.lineWidth = 0.035;
      c.moveTo(ox - lado * radio * 1.1, y + radio * 1.35);
      c.lineTo(ox + lado * radio * 1.3, y + radio * 1.7);
    }
    c.stroke();
  }
  c.restore();
}

/** Lo que el dibujo recuerda de cada pieza: parpadeo y caras (A2) y deformación (A3). */
export type VistaPieza = {
  proximoParpadeo: number;
  /** Hasta cuándo cierra los ojos contenta (perfecto). */
  contentaHasta: number;
  escalaX: number;
  escalaY: number;
};

type ImagenPieza = { escala: number; tema: Tema; color: HTMLCanvasElement; sombra: HTMLCanvasElement; ancho: number; alto: number };
type Variante = "normal" | "piedra" | Especial;

/** Decorado que aparece al subir (Anexo 1, 1.4). */
type Adorno = { tipo: "gaviota" | "globo" | "avion"; x: number; y: number; fase: number; color: string; velocidad: number };

/** Metros de mundo que caben en la columna; las muestras de la colección (C3) usan una vista más cerca. */
export type OpcionesLienzo = { anchoVista?: number; altoVista?: number };

/** Lo que pinta `efectos` en cada fotograma, con el mundo ya colocado (A3). */
export type CapaEfectos = {
  /** Desplazamiento de cámara por sacudida, en píxeles reales. */
  sacudida(ahora: number): { x: number; y: number };
  /** Deformación visual de una pieza (aplastar y estirar). */
  deformacion(pieza: Pieza, ahora: number): { x: number; y: number };
  /** Se llama con el contexto en metros (y hacia arriba). */
  dibujarMundo(ctx: CanvasRenderingContext2D, ahora: number): void;
  /** Se llama con el contexto en píxeles reales. */
  dibujarPantalla(ctx: CanvasRenderingContext2D, ahora: number, aPantalla: (x: number, y: number) => { x: number; y: number }): void;
};


export class Lienzo {
  private readonly ctx: CanvasRenderingContext2D;
  private escala = 1;
  private zoom = 1;
  private camaraY = 0;
  /** Píxeles reales tapados arriba por la tarjeta de fin. */
  private reserva = 0;
  /** Píxeles reales tapados arriba siempre (el HUD sobre el lienzo). */
  private arriba = 0;
  /** Ancho en píxeles reales de la columna de juego (en escritorio, el escenario sigue a los lados). */
  private columna = 1;
  private enFin = false;
  private tema: Tema = TEMA_RISO;
  private escenario: Escenario = ESCENARIO_PUERTO;
  private sombras: string[] = [];
  private cielo: CanvasGradient | null = null;
  private trama: CanvasPattern | null = null;
  private lejos: HTMLCanvasElement | null = null;
  private nubes: HTMLCanvasElement | null = null;
  private estrellas: HTMLCanvasElement | null = null;
  private readonly rutas = new WeakMap<Pieza, Path2D>();
  /** Imagen de cada pieza por variante: normal, piedra (cementada) o el tipo de especial (H3). */
  private readonly imagenes = new WeakMap<Pieza, Map<Variante, ImagenPieza>>();
  /** Fondo ya pintado (cielo, capas, muelle y marcas) y la cámara con que se pintó. */
  private fondo: HTMLCanvasElement | null = null;
  private fondoCamara = { y: Number.NaN, zoom: Number.NaN };
  private readonly vistas = new WeakMap<Pieza, VistaPieza>();
  private readonly azar = crearAzarVisual(0x70e5);
  private readonly adornos: Adorno[] = [];
  private fuenteLista = false;
  private colgadaAntes: { pieza: Pieza; x: number } | null = null;
  private inclinacion = 0;
  private efectos: CapaEfectos | null = null;
  private ajustado = false;
  /** Altura récord de la partida libre, o `null` si no se dibuja la línea (C2). */
  private alturaRecord: number | null = null;
  private readonly anchoVista: number;
  private readonly altoVista: number;

  /** `grano`: elemento sobre el lienzo que lleva la textura de papel como fondo CSS. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly grano: HTMLElement | null = null,
    { anchoVista = ANCHO_VISTA, altoVista = ALTO_VISTA }: OpcionesLienzo = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no permite dibujar en <canvas>");
    this.ctx = ctx;
    this.anchoVista = anchoVista;
    this.altoVista = altoVista;
    this.cambiarTema(TEMA_RISO, ESCENARIO_PUERTO);
    this.crearAdornos();
    document.fonts
      ?.load(`800 32px ${FAMILIA}`, "PERFECTO BIEN 0123456789 m")
      .then(() => {
        this.fuenteLista = true;
        this.fondoCamara.y = Number.NaN;
      })
      .catch(() => undefined);
  }

  /** ¿Puede el lienzo escribir con la fuente propia? */
  get conFuente(): boolean {
    return this.fuenteLista;
  }

  /** Píxeles reales por metro (sin zoom) y el zoom actual. */
  get medidas(): { escala: number; zoom: number } {
    return { escala: this.escala, zoom: this.zoom };
  }

  /** Metros que se ven sobre la plataforma con la cámara de ahora (escena de inicio, E2). */
  get metrosVisibles(): number {
    return this.canvas.height / (this.escala * this.zoom) - (MARGEN_SUELO - this.camaraY);
  }

  usarEfectos(efectos: CapaEfectos): void {
    this.efectos = efectos;
  }

  vista(pieza: Pieza, ahora: number): VistaPieza {
    let vista = this.vistas.get(pieza);
    if (!vista) {
      vista = { proximoParpadeo: ahora + entreVisual(this.azar, 2000, 5000), contentaHasta: 0, escalaX: 1, escalaY: 1 };
      this.vistas.set(pieza, vista);
    }
    return vista;
  }

  /** Cambia tema y escenario (los equipados en la colección, C3) y rehace lo precalculado. */
  cambiarTema(tema: Tema, escenario: Escenario): void {
    if (tema === this.tema && escenario === this.escenario && this.ajustado) return;
    this.tema = tema;
    this.escenario = escenario;
    this.sombras = tema.piezas.map((color) => oscurecer(color, 0.35));
    this.canvas.dataset.tema = tema.id;
    this.canvas.dataset.escenario = escenario.id;
    if (this.ajustado) this.precalcular();
  }

  /** Línea de récord a `metros` de altura (partida libre), o ninguna con `null` (C2). */
  ponerRecord(metros: number | null): void {
    this.alturaRecord = metros !== null && metros > 0 ? metros : null;
  }

  /**
   * Ajusta los píxeles reales al tamaño CSS y rehace degradado, tramas y capas
   * (solo aquí, no por fotograma). `columna` es el ancho CSS de la zona de
   * juego y `arriba` lo que tapa el HUD, ambos en píxeles CSS.
   */
  ajustar(columna?: number, arriba: number = 0): void {
    const ratio = ratioDePantalla();
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(width * ratio));
    this.canvas.height = Math.max(1, Math.round(height * ratio));
    this.columna = Math.max(1, Math.min(this.canvas.width, (columna ?? width) * ratio));
    this.arriba = Math.max(0, arriba * ratio);
    this.escala = Math.min(this.columna / this.anchoVista, (this.canvas.height - this.arriba) / this.altoVista);
    this.ajustado = true;
    this.precalcular();
    if (this.grano) {
      this.grano.style.backgroundImage = `url(${this.crearGrano().toDataURL()})`;
      this.grano.style.backgroundSize = `${LADO_GRANO / ratio}px`;
    }
  }

  /** Coloca la cámara al empezar una partida. */
  reiniciarCamara(): void {
    this.camaraY = 0;
    this.zoom = 1;
    this.reserva = 0;
    this.enFin = false;
    this.colgadaAntes = null;
  }

  /** Píxeles CSS que tapa arriba la tarjeta de fin (0 si no hay tarjeta). */
  reservarArriba(pixelesCss: number): void {
    this.reserva = Math.max(0, pixelesCss) * ratioDePantalla();
    this.enFin = this.reserva > 0;
  }

  /** `sueltas`: piezas que ya no están en la partida pero aún caen en pantalla (A3). */
  dibujar(estado: EstadoPartida | null, ahora: number = performance.now(), sueltas: readonly CuerpoVisible[] = []): void {
    const { ctx, canvas } = this;
    const fondo = this.fondo;
    if (!fondo) return;
    const altura = estado?.altura ?? 0;
    const altoLibre = (canvas.height - this.arriba) / this.escala;
    const tapado = Math.max(0, this.reserva - this.arriba) / this.escala;
    this.zoom += (zoomObjetivo(altura, this.enFin, altoLibre - tapado) - this.zoom) * 0.08;
    const k = this.escala * this.zoom;
    const objetivo = objetivoCamara(altura, (canvas.height - this.arriba) / k, Math.max(0, this.reserva - this.arriba) / k);
    this.camaraY += (objetivo - this.camaraY) * 0.08;
    const abajo = this.camaraY - MARGEN_SUELO - 1;
    const arribaVista = abajo + canvas.height / k + 2;
    const anchoVista = canvas.width / k + 2;
    const izquierda = -canvas.width / 2 / k - 1;

    // El fondo se repinta solo si la cámara se ha movido medio píxel o ha cambiado el zoom.
    const movida = Math.abs(this.camaraY - this.fondoCamara.y) * k > 0.5 || Math.abs(this.zoom - this.fondoCamara.zoom) > 0.0005;
    if (movida || Number.isNaN(this.fondoCamara.y)) {
      this.pintarFondo(fondo.getContext("2d")!, k, abajo, arribaVista, izquierda, anchoVista);
      this.fondoCamara = { y: this.camaraY, zoom: this.zoom };
    }
    const sacudida = this.efectos?.sacudida(ahora) ?? { x: 0, y: 0 };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    // Con sacudida, el fondo quieto debajo tapa los bordes que deja el desplazado.
    if (sacudida.x !== 0 || sacudida.y !== 0) ctx.drawImage(fondo, 0, 0);
    ctx.drawImage(fondo, sacudida.x, sacudida.y);

    const cx = canvas.width / 2 + sacudida.x;
    const sueloY = canvas.height - (MARGEN_SUELO - this.camaraY) * k + sacudida.y;
    ctx.setTransform(k, 0, 0, -k, cx, sueloY);
    this.dibujarAdornos(ctx, ahora, abajo, arribaVista, izquierda, anchoVista);
    if (this.alturaRecord !== null && this.alturaRecord > abajo && this.alturaRecord < arribaVista) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.dibujarRecord(ctx, alturaEnPantalla(this.alturaRecord, sueloY, k), k);
      ctx.setTransform(k, 0, 0, -k, cx, sueloY);
    }
    const cuerpos = (estado ? estado.cuerpos.concat(sueltas) : sueltas.slice()).filter((c) => enVista(c, abajo, arribaVista));
    for (const cuerpo of cuerpos) this.dibujarPieza(cuerpo, ahora, true);
    for (const cuerpo of cuerpos) this.dibujarPieza(cuerpo, ahora, false);
    if (estado?.colgada) this.dibujarColgada(estado, arribaVista, ahora);
    else this.colgadaAntes = null;
    this.dibujarAgua(ctx, ahora, abajo, izquierda, anchoVista);
    this.efectos?.dibujarMundo(ctx, ahora);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.efectos?.dibujarPantalla(ctx, ahora, (x, y) => ({ x: cx + x * k, y: sueloY - y * k }));
  }

  /** Cielo, estrellas, nubes, siluetas, muelle y marcas de altura, en el lienzo del fondo. */
  private pintarFondo(c: CanvasRenderingContext2D, k: number, abajo: number, arriba: number, izquierda: number, ancho: number): void {
    const sueloY = this.canvas.height - (MARGEN_SUELO - this.camaraY) * k;
    const mundo = () => c.setTransform(k, 0, 0, -k, this.canvas.width / 2, sueloY);
    mundo();
    c.globalAlpha = 1;
    c.fillStyle = this.cielo ?? this.escenario.cielo[0]!.color;
    c.fillRect(izquierda, abajo, ancho, arriba - abajo);
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.dibujarCapas(c, k, sueloY, (abajo + arriba) / 2);
    mundo();
    this.dibujarSuelo(c, abajo);
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.dibujarMarcas(c, k, sueloY, abajo, arriba);
  }

  private precalcular(): void {
    const { escala, escenario } = this;
    const [fondo, c] = this.lienzoAparte(this.canvas.width, this.canvas.height);
    this.fondo = fondo;
    this.fondoCamara = { y: Number.NaN, zoom: Number.NaN };
    // Degradado del cielo en metros (el mundo se dibuja con y hacia arriba).
    this.cielo = c.createLinearGradient(0, 0, 0, ALTURA_CIELO);
    for (const { metros, color } of escenario.cielo) this.cielo.addColorStop(Math.min(1, metros / ALTURA_CIELO), color);
    this.trama = this.crearTrama(escala);
    this.lejos = this.crearLejos(escala);
    this.nubes = this.crearNubes(escala);
    this.estrellas = this.crearEstrellas(escala);
  }

  private lienzoAparte(ancho: number, alto: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const aparte = document.createElement("canvas");
    aparte.width = Math.max(1, Math.round(ancho));
    aparte.height = Math.max(1, Math.round(alto));
    return [aparte, aparte.getContext("2d")!];
  }

  /** Trama de puntos de papel para la mitad de arriba de las piezas (Anexo 1, 1.3). */
  private crearTrama(escala: number): CanvasPattern | null {
    const lado = Math.max(4, Math.round(SEPARACION_TRAMA * escala));
    const [aparte, c] = this.lienzoAparte(lado, lado);
    c.fillStyle = this.tema.trama;
    c.globalAlpha = 0.38;
    c.beginPath();
    c.arc(lado / 2, lado / 2, lado * 0.27, 0, Math.PI * 2);
    c.fill();
    return this.ctx.createPattern(aparte, "repeat");
  }

  /**
   * Grano de papel y tinta irregular: motas de tinta y de papel sueltas, más
   * unas manchas claras grandes y muy tenues, como la tinta de una risografía.
   */
  private crearGrano(): HTMLCanvasElement {
    const lado = LADO_GRANO;
    const [aparte, c] = this.lienzoAparte(lado, lado);
    const azar = crearAzarVisual(0x9a1f);
    c.fillStyle = COLORES.papel;
    for (let i = 0; i < 14; i++) {
      c.globalAlpha = entreVisual(azar, 0.03, 0.07);
      c.beginPath();
      c.arc(azar() * lado, azar() * lado, entreVisual(azar, 8, 26), 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 1500; i++) {
      const tinta = azar() < 0.55;
      c.fillStyle = tinta ? COLORES.tinta : COLORES.papel;
      c.globalAlpha = tinta ? entreVisual(azar, 0.05, 0.16) : entreVisual(azar, 0.12, 0.3);
      const lado2 = azar() < 0.8 ? 1 : 2;
      c.fillRect(Math.floor(azar() * lado), Math.floor(azar() * lado), lado2, lado2);
    }
    return aparte;
  }

  /**
   * Capa lejana (paralaje 0,3), en silueta: el sol de dos tintas y, según el
   * escenario, el puerto, la ciudad o las islas flotantes.
   */
  private crearLejos(escala: number): HTMLCanvasElement {
    const alto = 3.6 * escala;
    const [aparte, c] = this.lienzoAparte(this.canvas.width, alto);
    const azar = crearAzarVisual(0x1e705);
    c.setTransform(escala, 0, 0, -escala, aparte.width / 2, aparte.height);
    const medio = aparte.width / 2 / escala;
    const [solA, solB] = this.escenario.sol;
    // Sol de dos tintas, la segunda algo desplazada, con franjas de papel abajo.
    c.globalAlpha = 0.9;
    c.fillStyle = solA;
    c.beginPath();
    c.arc(-2.1, 1.25, 1.35, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.5;
    c.fillStyle = solB;
    c.beginPath();
    c.arc(-2.1 + 0.16, 1.25 - 0.12, 1.35, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = this.escenario.cielo[0]!.color;
    for (const [y, alto] of [
      [0.42, 0.1],
      [0.68, 0.08],
      [0.9, 0.06],
    ] as const) {
      c.fillRect(-3.6, y, 3.2, alto);
    }
    if (this.escenario.lejos === "ciudad") this.pintarCiudad(c, medio, azar);
    else if (this.escenario.lejos === "nubes") this.pintarIslas(c, medio, azar);
    else this.pintarPuerto(c, medio, azar);
    return aparte;
  }

  /** Grúas, contenedores, un faro y barcos en silueta. */
  private pintarPuerto(c: CanvasRenderingContext2D, medio: number, azar: () => number): void {
    c.fillStyle = this.escenario.siluetas;
    // Costa baja a lo largo de todo el ancho.
    c.fillRect(-medio, 0, medio * 2, 0.35);
    const grua = (x: number, alto: number, haciaDerecha: boolean) => {
      const s = haciaDerecha ? 1 : -1;
      c.fillRect(x - 0.08, 0, 0.16, alto);
      c.fillRect(x - 0.35, 0, 0.7, 0.12);
      c.beginPath();
      c.moveTo(x, alto);
      c.lineTo(x + s * 1.9, alto - 0.12);
      c.lineTo(x + s * 1.9, alto - 0.24);
      c.lineTo(x, alto - 0.3);
      c.closePath();
      c.fill();
      c.fillRect(x - s * 0.55, alto - 0.28, s * 0.55, 0.2);
      c.fillRect(x + s * 1.4 - 0.01, alto - 0.9, 0.02, 0.7);
      c.fillRect(x + s * 1.4 - 0.12, alto - 1.05, 0.24, 0.16);
    };
    const contenedores = (x: number) => {
      for (let fila = 0; fila < 3; fila++) {
        const n = 3 - fila;
        for (let i = 0; i < n; i++) c.fillRect(x + i * 0.62 + fila * 0.31, 0.35 + fila * 0.32, 0.58, 0.28);
      }
    };
    const barco = (x: number) => {
      c.beginPath();
      c.moveTo(x - 1.1, 0.5);
      c.lineTo(x + 1.3, 0.5);
      c.lineTo(x + 1.0, 0.15);
      c.lineTo(x - 0.9, 0.15);
      c.closePath();
      c.fill();
      c.fillRect(x - 0.4, 0.5, 0.8, 0.35);
      c.fillRect(x + 0.1, 0.85, 0.22, 0.4);
    };
    const faro = (x: number) => {
      c.beginPath();
      c.moveTo(x - 0.28, 0.35);
      c.lineTo(x + 0.28, 0.35);
      c.lineTo(x + 0.17, 2.2);
      c.lineTo(x - 0.17, 2.2);
      c.closePath();
      c.fill();
      c.fillRect(x - 0.24, 2.2, 0.48, 0.3);
      c.beginPath();
      c.moveTo(x - 0.26, 2.5);
      c.lineTo(x, 2.78);
      c.lineTo(x + 0.26, 2.5);
      c.fill();
    };
    // El centro, que se ve en el móvil, va compuesto a mano; los lados, que
    // se ven en escritorio, salen del azar visual.
    grua(-3.3, 2.9, true);
    contenedores(1.6);
    faro(4.1);
    barco(-0.6);
    for (const lado of [-1, 1]) {
      for (let d = 6 + entreVisual(azar, 0, 1.2); d < medio + 2; d += entreVisual(azar, 3.2, 4.6)) {
        const x = lado * d;
        const tipo = azar();
        // A los lados no hay más faros: uno en el centro basta.
        if (tipo < 0.5) grua(x, entreVisual(azar, 2.3, 3.1), azar() < 0.5);
        else if (tipo < 0.75) contenedores(x - 0.8);
        else barco(x);
      }
    }
  }

  /**
   * Ciudad junto a un canal: una fila de edificios lejanos más clara y otra
   * delante con ventanas, depósitos de agua en las azoteas y antenas.
   */
  private pintarCiudad(c: CanvasRenderingContext2D, medio: number, azar: () => number): void {
    const { siluetas, cielo } = this.escenario;
    const atras = mezclar(cielo[0]!.color, siluetas, 0.55);
    const ventana = cielo[0]!.color;
    const deposito = (x: number, y: number) => {
      c.fillRect(x - 0.17, y, 0.04, 0.32);
      c.fillRect(x + 0.13, y, 0.04, 0.32);
      c.fillRect(x - 0.22, y + 0.3, 0.44, 0.48);
      c.beginPath();
      c.moveTo(x - 0.27, y + 0.78);
      c.lineTo(x, y + 1.02);
      c.lineTo(x + 0.27, y + 0.78);
      c.closePath();
      c.fill();
    };
    type Remate = "deposito" | "antena" | "torre" | null;
    const edificio = (x: number, ancho: number, alto: number, color: string, remate: Remate, conVentanas: boolean) => {
      c.fillStyle = color;
      c.fillRect(x, 0, ancho, alto);
      // Pretil de la azotea, algo más ancho.
      c.fillRect(x - 0.05, alto - 0.08, ancho + 0.1, 0.1);
      if (remate === "deposito") deposito(x + ancho * 0.68, alto);
      else if (remate === "antena") {
        c.fillRect(x + ancho * 0.3 - 0.02, alto, 0.04, 0.9);
        c.fillRect(x + ancho * 0.3 - 0.14, alto + 0.55, 0.28, 0.04);
      } else if (remate === "torre") {
        c.beginPath();
        c.moveTo(x + 0.1, alto);
        c.lineTo(x + ancho / 2, alto + 1.1);
        c.lineTo(x + ancho - 0.1, alto);
        c.closePath();
        c.fill();
      }
      if (!conVentanas) return;
      c.fillStyle = ventana;
      for (let y = 0.45; y < alto - 0.35; y += 0.42) {
        for (let vx = x + 0.16; vx < x + ancho - 0.24; vx += 0.3) {
          c.globalAlpha = azar() < 0.22 ? 0.95 : 0.55;
          c.fillRect(vx, y, 0.13, 0.19);
        }
      }
      c.globalAlpha = 1;
    };
    const atrasMano: ReadonlyArray<[number, number, number, Remate]> = [
      [-3.9, 1.1, 3.2, "antena"],
      [-0.6, 1.2, 2.9, null],
      [0.9, 0.9, 3.35, "torre"],
      [3.4, 1.2, 2.6, "deposito"],
    ];
    // Fila de atrás, más clara y alta.
    for (const [x, ancho, alto, remate] of atrasMano) edificio(x, ancho, alto, atras, remate, false);
    for (const lado of [-1, 1]) {
      for (let d = 5.6 + entreVisual(azar, 0, 0.8); d < medio + 2; d += entreVisual(azar, 1.3, 2.2)) {
        const tipo = azar();
        edificio(lado * d - 0.6, entreVisual(azar, 0.9, 1.4), entreVisual(azar, 2.3, 3.3), atras, tipo < 0.3 ? "antena" : tipo < 0.45 ? "torre" : null, false);
      }
    }
    // Fila de delante, con ventanas y depósitos de agua.
    c.fillStyle = siluetas;
    c.fillRect(-medio, 0, medio * 2, 0.3);
    const delanteMano: ReadonlyArray<[number, number, number, Remate]> = [
      [-4.5, 1.3, 2.2, "deposito"],
      [-3.05, 1.0, 1.55, null],
      [-1.85, 1.45, 2.45, "antena"],
      [1.5, 1.15, 1.75, "deposito"],
      [2.85, 1.5, 2.25, null],
      [4.5, 1.0, 1.4, "deposito"],
    ];
    for (const [x, ancho, alto, remate] of delanteMano) edificio(x, ancho, alto, siluetas, remate, true);
    for (const lado of [-1, 1]) {
      for (let d = 6 + entreVisual(azar, 0, 1); d < medio + 2; d += entreVisual(azar, 1.5, 2.4)) {
        const tipo = azar();
        edificio(lado * d - 0.6, entreVisual(azar, 1, 1.6), entreVisual(azar, 1.3, 2.5), siluetas, tipo < 0.45 ? "deposito" : tipo < 0.65 ? "antena" : null, true);
      }
    }
  }

  /**
   * Islas flotantes lejanas con árboles y cascadas, un arcoíris de tres tintas
   * y un banco de nubes abajo.
   */
  private pintarIslas(c: CanvasRenderingContext2D, medio: number, azar: () => number): void {
    const { siluetas, nubes, cielo } = this.escenario;
    // Arcoíris de tres tintas, suave.
    c.lineWidth = 0.22;
    for (const [i, color] of [COLORES.rosa, COLORES.amarillo, COLORES.turquesa].entries()) {
      c.globalAlpha = 0.45;
      c.strokeStyle = color;
      c.beginPath();
      c.arc(1.2 + i * 0.03, 0, 3.0 - i * 0.22, 0, Math.PI);
      c.stroke();
    }
    c.globalAlpha = 1;
    const hierba = mezclar(siluetas, COLORES.verde, 0.45);
    const isla = (x: number, y: number, ancho: number) => {
      // Cascada de papel que cae del borde, detrás de la roca.
      c.fillStyle = cielo[0]!.color;
      c.globalAlpha = 0.85;
      c.fillRect(x + ancho * 0.3, 0.3, 0.07, y - 0.3);
      c.globalAlpha = 1;
      // Roca colgante, en punta hacia abajo.
      c.fillStyle = siluetas;
      c.beginPath();
      c.moveTo(x - ancho / 2, y);
      c.lineTo(x + ancho / 2, y);
      c.lineTo(x + ancho * 0.4, y - ancho * 0.2);
      c.lineTo(x + ancho * 0.2, y - ancho * 0.42);
      c.lineTo(x + ancho * 0.04, y - ancho * 0.78);
      c.lineTo(x - ancho * 0.14, y - ancho * 0.48);
      c.lineTo(x - ancho * 0.38, y - ancho * 0.24);
      c.closePath();
      c.fill();
      // Hierba por encima y dos árboles redondos.
      c.fillStyle = hierba;
      c.fillRect(x - ancho / 2 - 0.04, y - 0.06, ancho + 0.08, 0.14);
      for (const [dx, alto] of [
        [-0.22, 0.32],
        [0.12, 0.22],
      ] as const) {
        c.fillRect(x + dx * ancho - 0.025, y, 0.05, alto);
        c.beginPath();
        c.arc(x + dx * ancho, y + alto + 0.1, 0.15, 0, Math.PI * 2);
        c.fill();
      }
    };
    isla(-3.2, 2.35, 1.7);
    isla(2.7, 1.55, 1.25);
    isla(4.4, 2.85, 0.8);
    isla(-0.2, 3.0, 0.6);
    for (const lado of [-1, 1]) {
      for (let d = 6 + entreVisual(azar, 0, 1.2); d < medio + 2; d += entreVisual(azar, 2.4, 3.6)) {
        isla(lado * d, entreVisual(azar, 1.4, 3), entreVisual(azar, 0.7, 1.6));
      }
    }
    // Banco de nubes a lo largo de todo el ancho, con sombra fuera de registro.
    const banco = (dx: number, dy: number) => {
      c.beginPath();
      c.rect(-medio, dy, medio * 2, 0.32);
      for (let x = -medio; x < medio + 1; x += 0.75) {
        const r = 0.32 + (Math.abs(Math.sin(x * 13.7)) * 0.28);
        c.moveTo(x + dx + r, 0.32 + dy);
        c.arc(x + dx, 0.32 + dy, r, 0, Math.PI * 2);
      }
      c.fill();
    };
    c.fillStyle = COLORES.papelOscuro;
    banco(0.09, -0.07);
    c.fillStyle = nubes;
    banco(0, 0);
  }

  /** Nubes de papel (paralaje 0,6) en un lienzo que se repite hacia arriba; sombra fuera de registro. */
  private crearNubes(escala: number): HTMLCanvasElement {
    const alto = 16 * escala;
    const [aparte, c] = this.lienzoAparte(this.canvas.width, alto);
    const azar = crearAzarVisual(0xc10d);
    const medio = aparte.width / 2 / escala;
    c.setTransform(escala, 0, 0, -escala, aparte.width / 2, aparte.height);
    const nube = (x: number, y: number, tam: number) => {
      const bolas = [
        [-0.9, 0, 0.55],
        [-0.3, 0.25, 0.75],
        [0.45, 0.15, 0.6],
        [1.0, -0.02, 0.42],
      ] as const;
      const forma = (dx: number, dy: number) => {
        c.beginPath();
        for (const [bx, by, r] of bolas) {
          c.moveTo(x + dx + (bx + r) * tam, y + dy + by * tam);
          c.arc(x + dx + bx * tam, y + dy + by * tam, r * tam, 0, Math.PI * 2);
        }
        c.rect(x + dx - 0.9 * tam, y + dy - 0.42 * tam, 1.9 * tam, 0.42 * tam);
        c.fill();
      };
      c.fillStyle = COLORES.papelOscuro;
      forma(0.09, -0.07);
      c.fillStyle = this.escenario.nubes;
      forma(0, 0);
    };
    const n = Math.max(3, Math.round(medio / 2.2));
    for (let i = 0; i < n; i++) {
      nube(entreVisual(azar, -medio + 1, medio - 1), entreVisual(azar, 1.5, 14.5), entreVisual(azar, 0.55, 1.05));
    }
    return aparte;
  }

  /** Estrellas del cielo de noche (desde 100 m): puntos y destellos de cuatro puntas. */
  private crearEstrellas(escala: number): HTMLCanvasElement {
    const alto = 14 * escala;
    const [aparte, c] = this.lienzoAparte(this.canvas.width, alto);
    const azar = crearAzarVisual(0x57a2);
    c.fillStyle = this.escenario.estrellas;
    const total = Math.round((aparte.width * aparte.height) / (escala * escala * 3));
    for (let i = 0; i < total; i++) {
      const x = azar() * aparte.width;
      const y = azar() * aparte.height;
      if (azar() < 0.15) {
        const r = escala * entreVisual(azar, 0.1, 0.18);
        c.beginPath();
        c.moveTo(x, y - r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.quadraticCurveTo(x, y, x, y + r);
        c.quadraticCurveTo(x, y, x - r, y);
        c.quadraticCurveTo(x, y, x, y - r);
        c.fill();
      } else {
        c.globalAlpha = entreVisual(azar, 0.4, 1);
        c.fillRect(x, y, Math.max(1, escala * 0.03), Math.max(1, escala * 0.03));
        c.globalAlpha = 1;
      }
    }
    return aparte;
  }

  private crearAdornos(): void {
    const azar = this.azar;
    const colores = TEMA_RISO.piezas;
    for (let i = 0; i < 14; i++) {
      this.adornos.push({ tipo: "gaviota", x: entreVisual(azar, -14, 14), y: entreVisual(azar, 10, 30), fase: azar() * 6, color: COLORES.tinta, velocidad: entreVisual(azar, 0.3, 0.7) });
    }
    for (let i = 0; i < 9; i++) {
      const color = colores[Math.floor(azar() * colores.length)]!;
      this.adornos.push({ tipo: "globo", x: entreVisual(azar, -13, 13), y: entreVisual(azar, 32, 60), fase: azar() * 6, color, velocidad: entreVisual(azar, 0.05, 0.15) });
    }
    for (let i = 0; i < 9; i++) {
      this.adornos.push({ tipo: "avion", x: entreVisual(azar, -14, 14), y: entreVisual(azar, 62, 100), fase: azar() * 6, color: COLORES.papel, velocidad: entreVisual(azar, 0.4, 0.9) });
    }
  }

  /** Capas de fondo en píxeles reales, cada una con su paralaje. */
  private dibujarCapas(ctx: CanvasRenderingContext2D, k: number, sueloY: number, alturaMedia: number): void {
    const { canvas, zoom } = this;
    const capaY = (factor: number, metros: number) => canvas.height - (MARGEN_SUELO - this.camaraY * factor) * k - metros * k;
    const repetir = (capa: HTMLCanvasElement, factor: number, alpha: number) => {
      if (alpha <= 0.01) return;
      const alto = capa.height * zoom;
      const ancho = capa.width * zoom;
      const x = (canvas.width - ancho) / 2;
      let y = (((this.camaraY * factor * k) % alto) + alto) % alto - alto;
      ctx.globalAlpha = alpha;
      for (; y < canvas.height; y += alto) ctx.drawImage(capa, x, y, ancho, alto);
      ctx.globalAlpha = 1;
    };
    if (this.estrellas) repetir(this.estrellas, 0.2, Math.min(1, Math.max(0, (alturaMedia - 80) / 25)));
    if (this.nubes) repetir(this.nubes, 0.6, 1 - 0.8 * Math.min(1, Math.max(0, (alturaMedia - 45) / 40)));
    const base = capaY(0.3, NIVEL_AGUA + 0.05);
    if (base - (this.lejos?.height ?? 0) * zoom < canvas.height && this.lejos) {
      const ancho = this.lejos.width * zoom;
      ctx.drawImage(this.lejos, (canvas.width - ancho) / 2, base - this.lejos.height * zoom, ancho, this.lejos.height * zoom);
      // Mar lejano entre la costa y el agua de delante.
      ctx.fillStyle = mezclar(this.escenario.agua, COLORES.papel, 0.35);
      ctx.fillRect(0, base, canvas.width, Math.max(0, sueloY - NIVEL_AGUA * k - base + 2));
    }
  }

  private dibujarAdornos(ctx: CanvasRenderingContext2D, ahora: number, abajo: number, arriba: number, izquierda: number, ancho: number): void {
    const t = ahora / 1000;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const a of this.adornos) {
      if (a.y < abajo - 1 || a.y > arriba + 1) continue;
      // Avanzan despacio y dan la vuelta a lo ancho de la vista.
      const x = izquierda + ((((a.x - izquierda + t * a.velocidad) % (ancho + 4)) + ancho + 4) % (ancho + 4)) - 2;
      if (a.tipo === "gaviota") {
        const aleteo = Math.sin(t * 6 + a.fase) * 0.12;
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.moveTo(x - 0.32, a.y + 0.1 + aleteo);
        ctx.quadraticCurveTo(x - 0.15, a.y + 0.14, x, a.y);
        ctx.quadraticCurveTo(x + 0.15, a.y + 0.14, x + 0.32, a.y + 0.1 + aleteo);
        ctx.stroke();
      } else if (a.tipo === "globo") {
        const y = a.y + Math.sin(t * 0.8 + a.fase) * 0.2;
        ctx.fillStyle = oscurecer(a.color, 0.35);
        ctx.beginPath();
        ctx.ellipse(x + SOMBRA_X, y + SOMBRA_Y, 0.55, 0.68, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.ellipse(x + REGISTRO_X, y + REGISTRO_Y, 0.55, 0.68, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = CONTORNO;
        ctx.beginPath();
        ctx.ellipse(x, y, 0.55, 0.68, 0, 0, Math.PI * 2);
        ctx.moveTo(x - 0.2, y - 0.62);
        ctx.lineTo(x - 0.12, y - 1.0);
        ctx.moveTo(x + 0.2, y - 0.62);
        ctx.lineTo(x + 0.12, y - 1.0);
        ctx.stroke();
        ctx.fillStyle = COLORES.naranja;
        ctx.fillRect(x - 0.14, y - 1.22, 0.28, 0.22);
        ctx.strokeRect(x - 0.14, y - 1.22, 0.28, 0.22);
      } else {
        const y = a.y + Math.sin(t * 1.3 + a.fase) * 0.15;
        ctx.fillStyle = COLORES.papelOscuro;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y);
        ctx.lineTo(x - 0.45, y + 0.22);
        ctx.lineTo(x - 0.2, y - 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y);
        ctx.lineTo(x - 0.45, y - 0.2);
        ctx.lineTo(x - 0.2, y - 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }
    }
  }

  /** Lo que sostiene la torre según el escenario: muelle, azotea o isla flotante. */
  private dibujarSuelo(ctx: CanvasRenderingContext2D, abajo: number): void {
    if (this.escenario.suelo === "azotea") this.dibujarAzotea(ctx, abajo);
    else if (this.escenario.suelo === "isla") this.dibujarIsla(ctx);
    else this.dibujarMuelle(ctx, abajo);
  }

  /** Muelle de madera: tablas, cara frontal con salvavidas y pilotes que bajan al agua. */
  private dibujarMuelle(ctx: CanvasRenderingContext2D, abajo: number): void {
    const { escenario } = this;
    const medio = PLATAFORMA_MEDIO_ANCHO;
    ctx.lineWidth = CONTORNO;
    ctx.strokeStyle = COLORES.tinta;
    ctx.fillStyle = escenario.soportes;
    for (const x of [-medio + 0.11, -0.7, 0.7, medio - 0.11]) ctx.fillRect(x - 0.11, abajo, 0.22, -0.4 - abajo);
    // Sombra de impresión del muelle.
    ctx.fillStyle = COLORES.tinta;
    ctx.fillRect(-medio + SOMBRA_X, -0.44 + SOMBRA_Y, medio * 2, 0.44);
    ctx.fillStyle = escenario.frente;
    ctx.fillRect(-medio + REGISTRO_X, -0.44 + REGISTRO_Y, medio * 2, 0.32);
    ctx.fillStyle = escenario.superficie;
    ctx.fillRect(-medio + REGISTRO_X, -0.12 + REGISTRO_Y, medio * 2, 0.12);
    ctx.strokeRect(-medio, -0.44, medio * 2, 0.44);
    ctx.beginPath();
    ctx.moveTo(-medio, -0.12);
    ctx.lineTo(medio, -0.12);
    for (let x = -medio + 0.8; x < medio; x += 0.8) {
      ctx.moveTo(x, -0.12);
      ctx.lineTo(x, -0.44);
    }
    ctx.stroke();
    // Salvavidas en la cara del muelle.
    ctx.fillStyle = COLORES.papel;
    ctx.beginPath();
    ctx.arc(-1.2, -0.28, 0.13, 0, Math.PI * 2);
    ctx.arc(-1.2, -0.28, 0.06, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.strokeStyle = COLORES.rosa;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.arc(-1.2, -0.28, 0.095, -0.4, 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-1.2, -0.28, 0.095, Math.PI - 0.4, Math.PI + 0.4);
    ctx.stroke();
    ctx.strokeStyle = COLORES.tinta;
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.arc(-1.2, -0.28, 0.13, 0, Math.PI * 2);
    ctx.moveTo(-1.2 + 0.06, -0.28);
    ctx.arc(-1.2, -0.28, 0.06, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** Azotea: cornisa de piedra y fachada de ladrillo con ventanas que baja hasta el canal. */
  private dibujarAzotea(ctx: CanvasRenderingContext2D, abajo: number): void {
    const { escenario } = this;
    const medio = PLATAFORMA_MEDIO_ANCHO;
    const fachada = medio - 0.12;
    ctx.lineWidth = CONTORNO;
    ctx.strokeStyle = COLORES.tinta;
    // Fachada: sombra de impresión, ladrillo y ventanas por filas.
    ctx.fillStyle = COLORES.tinta;
    ctx.fillRect(-fachada + SOMBRA_X, abajo, fachada * 2, -0.3 - abajo);
    ctx.fillStyle = escenario.frente;
    ctx.fillRect(-fachada + REGISTRO_X, abajo, fachada * 2, -0.3 - abajo + REGISTRO_Y);
    ctx.strokeRect(-fachada, abajo, fachada * 2, -0.3 - abajo);
    ctx.lineWidth = 0.025;
    for (let fila = 0, y = -0.5; y - 0.42 > abajo && fila < 6; fila++, y -= 0.75) {
      for (let i = 0, x = -fachada + 0.3; x + 0.4 < fachada; i++, x += 0.72) {
        // Siempre las mismas ventanas encendidas.
        ctx.fillStyle = (fila * 3 + i * 5) % 7 === 1 ? COLORES.amarillo : escenario.soportes;
        ctx.fillRect(x, y - 0.42, 0.4, 0.42);
        ctx.strokeRect(x, y - 0.42, 0.4, 0.42);
        ctx.beginPath();
        ctx.moveTo(x + 0.2, y - 0.42);
        ctx.lineTo(x + 0.2, y);
        ctx.stroke();
      }
    }
    // Cornisa de piedra, algo más ancha que la fachada.
    ctx.lineWidth = CONTORNO;
    ctx.fillStyle = COLORES.tinta;
    ctx.fillRect(-medio + SOMBRA_X, -0.3 + SOMBRA_Y, medio * 2, 0.3);
    ctx.fillStyle = escenario.superficie;
    ctx.fillRect(-medio + REGISTRO_X, -0.3 + REGISTRO_Y, medio * 2, 0.3);
    ctx.fillStyle = oscurecer(escenario.superficie, 0.18);
    ctx.fillRect(-medio + REGISTRO_X, -0.3 + REGISTRO_Y, medio * 2, 0.09);
    ctx.strokeRect(-medio, -0.3, medio * 2, 0.3);
    ctx.beginPath();
    ctx.moveTo(-medio, -0.21);
    ctx.lineTo(medio, -0.21);
    ctx.stroke();
  }

  /** Isla flotante: hierba, franja de tierra y roca colgante con vetas, raíces y una cascada. */
  private dibujarIsla(ctx: CanvasRenderingContext2D): void {
    const { escenario } = this;
    const medio = PLATAFORMA_MEDIO_ANCHO;
    const roca = new Path2D();
    roca.moveTo(-medio, -0.42);
    roca.lineTo(-medio + 0.35, -1.05);
    roca.lineTo(-1.0, -1.25);
    roca.lineTo(-0.55, -1.95);
    roca.lineTo(0.05, -2.45);
    roca.lineTo(0.5, -1.8);
    roca.lineTo(1.15, -1.45);
    roca.lineTo(medio - 0.25, -0.95);
    roca.lineTo(medio, -0.42);
    roca.closePath();
    ctx.lineWidth = CONTORNO;
    ctx.lineJoin = "round";
    // Sombra de impresión de toda la isla.
    ctx.save();
    ctx.translate(SOMBRA_X, SOMBRA_Y);
    ctx.fillStyle = COLORES.tinta;
    ctx.fill(roca);
    ctx.fillRect(-medio, -0.42, medio * 2, 0.42);
    ctx.restore();
    ctx.save();
    ctx.translate(REGISTRO_X, REGISTRO_Y);
    ctx.fillStyle = escenario.soportes;
    ctx.fill(roca);
    ctx.restore();
    // Vetas de la roca y raíces que cuelgan.
    ctx.strokeStyle = oscurecer(escenario.soportes, 0.3);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of [
      [-1.5, -0.8, -0.6, -0.95],
      [-0.7, -1.4, 0.2, -1.55],
      [0.4, -1.0, 1.4, -0.9],
      [-0.2, -2.0, 0.3, -2.05],
    ] as const) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.strokeStyle = COLORES.tinta;
    ctx.lineWidth = CONTORNO;
    ctx.stroke(roca);
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (const [x, largo] of [
      [-1.35, 0.5],
      [0.85, 0.65],
      [1.3, 0.35],
    ] as const) {
      ctx.moveTo(x, -1.0);
      ctx.quadraticCurveTo(x + 0.12, -1.0 - largo / 2, x - 0.04, -1.0 - largo);
    }
    ctx.stroke();
    // Cascada de papel desde el borde hasta el mar de nubes.
    ctx.fillStyle = COLORES.papel;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-1.75, NIVEL_AGUA - 0.2, 0.16, -0.5 - NIVEL_AGUA + 0.2);
    ctx.globalAlpha = 1;
    // Tierra y hierba con gotas colgando.
    ctx.fillStyle = escenario.frente;
    ctx.fillRect(-medio + REGISTRO_X, -0.42 + REGISTRO_Y, medio * 2, 0.3);
    ctx.fillStyle = escenario.superficie;
    ctx.beginPath();
    ctx.rect(-medio + REGISTRO_X, -0.14 + REGISTRO_Y, medio * 2, 0.14);
    for (let x = -medio + 0.2; x < medio; x += 0.4) {
      ctx.moveTo(x + 0.1 + REGISTRO_X, -0.14 + REGISTRO_Y);
      ctx.arc(x + REGISTRO_X, -0.14 + REGISTRO_Y, 0.1, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeRect(-medio, -0.42, medio * 2, 0.42);
    ctx.beginPath();
    ctx.moveTo(-medio, -0.14);
    ctx.lineTo(medio, -0.14);
    ctx.stroke();
  }

  /** Línea discontinua de récord a la fila `y` (píxeles reales) con su etiqueta, en la columna (C2). */
  private dibujarRecord(ctx: CanvasRenderingContext2D, y: number, k: number): void {
    const ancho = this.columna * this.zoom;
    const izquierda = (this.canvas.width - ancho) / 2;
    ctx.save();
    ctx.strokeStyle = COLORES.rosa;
    ctx.lineWidth = Math.max(2, k * 0.04);
    ctx.setLineDash([RAYA_RECORD * k, RAYA_RECORD * k * 0.7]);
    ctx.beginPath();
    ctx.moveTo(izquierda, y);
    ctx.lineTo(izquierda + ancho, y);
    ctx.stroke();
    ctx.restore();
    if (!this.fuenteLista) return;
    const px = Math.round(Math.max(11, 0.3 * k));
    ctx.font = `800 ${px}px ${FAMILIA}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const x = izquierda + ancho - Math.max(6, 0.15 * k);
    const caja = ctx.measureText("Récord").width;
    ctx.fillStyle = COLORES.rosa;
    ctx.fillRect(x - caja - px * 0.4, y - px * 1.35, caja + px * 0.8, px * 1.35);
    ctx.fillStyle = COLORES.tinta;
    ctx.fillText("Récord", x, y - px * 0.18);
  }

  /** Marcas de altura cada 5 m en el borde izquierdo de la columna (Anexo 1, 1.4). */
  private dibujarMarcas(ctx: CanvasRenderingContext2D, k: number, sueloY: number, abajo: number, arriba: number): void {
    const izquierda = (this.canvas.width - this.columna * this.zoom) / 2 + Math.max(6, 0.15 * k);
    const px = Math.round(Math.max(10, 0.26 * k));
    ctx.font = `700 ${px}px ${FAMILIA}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let m = 5 * Math.max(1, Math.ceil(abajo / 5)); m <= arriba; m += 5) {
      const y = sueloY - m * k;
      // Lo que queda bajo el HUD no se marca.
      if (y < this.arriba + px) continue;
      const color = m >= 50 ? COLORES.papel : COLORES.tinta;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = color;
      ctx.fillRect(izquierda, y - Math.max(1, k * 0.015), px * 0.9, Math.max(2, k * 0.03));
      if (this.fuenteLista) ctx.fillText(`${m} m`, izquierda + px * 1.2, y);
    }
    ctx.globalAlpha = 1;
  }

  private ruta(pieza: Pieza): Path2D {
    let ruta = this.rutas.get(pieza);
    if (!ruta) {
      ruta = rutaPieza(pieza);
      this.rutas.set(pieza, ruta);
    }
    return ruta;
  }

  /**
   * Imagen de la pieza ya impresa (color fuera de registro, trama, contorno y,
   * en la base, vetas de piedra) y su sombra, a la escala actual. Se pinta la
   * primera vez y se reutiliza: por fotograma solo hay `drawImage`. Se pinta con
   * la y hacia abajo para que salga derecha en el mundo, que la tiene hacia arriba.
   */
  private crearImagenPieza(pieza: Pieza, variante: Variante): ImagenPieza {
    const { escala, tema } = this;
    const piedra = variante === "piedra";
    const especial = piedra || variante === "normal" ? null : variante;
    const margen = especial ? MARGEN_ESPECIAL : MARGEN_IMAGEN;
    const ancho = pieza.ancho + 2 * margen;
    const alto = pieza.alto + 2 * margen;
    const ruta = this.ruta(pieza);
    const [color, c] = this.lienzoAparte(ancho * escala, alto * escala);
    const centro = () => c.setTransform(escala, 0, 0, escala, color.width / 2, color.height / 2);
    centro();
    c.translate(REGISTRO_X, REGISTRO_Y);
    c.fillStyle = especial ? ESPECIALES_DIBUJO[especial].relleno : piedra ? tema.piedra : (tema.piezas[pieza.color] ?? COLORES.papelOscuro);
    c.fill(ruta);
    if (this.trama) {
      this.trama.setTransform(new DOMMatrix().scale(1 / escala).rotate(45));
      c.save();
      c.clip(ruta);
      c.fillStyle = this.trama;
      c.fillRect(-pieza.ancho / 2, 0, pieza.ancho, pieza.alto / 2);
      c.restore();
    }
    if (tema.textura && !piedra && !especial) {
      c.save();
      c.clip(ruta);
      this.pintarTextura(c, pieza, tema.textura);
      c.restore();
    }
    centro();
    if (piedra) {
      // Vetas de piedra en la base cementada, siempre las mismas para cada pieza.
      const azar = crearAzarVisual(Math.round(pieza.ancho * 1000 + pieza.alto * 7));
      c.fillStyle = oscurecer(tema.piedra, 0.2);
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(entreVisual(azar, -0.35, 0.35) * pieza.ancho, entreVisual(azar, -0.3, 0.3) * pieza.alto, entreVisual(azar, 0.03, 0.06), 0, Math.PI * 2);
        c.fill();
      }
    }
    if (especial) pintarAdornoEspecial(c, pieza, especial, ruta);
    if (tema.filo && !piedra && !especial) {
      // Filo de luz por dentro del contorno: se pinta ancho, recortado a la pieza.
      c.save();
      c.clip(ruta);
      c.globalAlpha = 0.75;
      c.strokeStyle = tema.filo;
      c.lineWidth = CONTORNO * 3.2;
      c.stroke(ruta);
      c.restore();
    }
    c.strokeStyle = especial ? ESPECIALES_DIBUJO[especial].contorno : tema.contorno;
    c.lineWidth = especial ? CONTORNO * 1.5 : CONTORNO;
    c.lineJoin = "round";
    c.stroke(ruta);
    const [sombra, s] = this.lienzoAparte(color.width, color.height);
    s.setTransform(escala, 0, 0, escala, sombra.width / 2, sombra.height / 2);
    s.fillStyle = especial ? ESPECIALES_DIBUJO[especial].sombra : piedra ? oscurecer(tema.piedra, 0.35) : (this.sombras[pieza.color] ?? COLORES.tinta);
    s.fill(ruta);
    return { escala, tema, color, sombra, ancho, alto };
  }

  /**
   * Textura del tema sobre el color (C3), en metros con el centro de la pieza
   * en el origen: vetas de madera, vetas de mármol o rayas de caramelo. Siempre
   * la misma para cada pieza (azar visual con sus medidas).
   */
  private pintarTextura(c: CanvasRenderingContext2D, pieza: Pieza, textura: NonNullable<Tema["textura"]>): void {
    const azar = crearAzarVisual(Math.round(pieza.ancho * 997 + pieza.alto * 31 + pieza.color));
    const medioAncho = pieza.ancho / 2 + 0.1;
    const medioAlto = pieza.alto / 2 + 0.1;
    c.strokeStyle = textura.color;
    c.fillStyle = textura.color;
    c.lineCap = "round";
    if (textura.tipo === "rayas") {
      c.globalAlpha = 0.5;
      c.lineWidth = 0.11;
      c.beginPath();
      for (let x = -medioAncho - medioAlto; x < medioAncho + medioAlto; x += 0.32) {
        c.moveTo(x, -medioAlto);
        c.lineTo(x + medioAlto * 2, medioAlto);
      }
      c.stroke();
    } else if (textura.tipo === "madera") {
      c.globalAlpha = 0.4;
      c.lineWidth = 0.022;
      c.beginPath();
      for (let y = -medioAlto + entreVisual(azar, 0.06, 0.14); y < medioAlto; y += entreVisual(azar, 0.12, 0.2)) {
        c.moveTo(-medioAncho, y);
        const onda = entreVisual(azar, -0.05, 0.05);
        c.bezierCurveTo(-medioAncho / 3, y + onda, medioAncho / 3, y - onda, medioAncho, y + onda / 2);
      }
      c.stroke();
      if (pieza.ancho > 0.7 && azar() < 0.7) {
        c.lineWidth = 0.02;
        c.beginPath();
        c.ellipse(entreVisual(azar, -0.25, 0.25) * pieza.ancho, entreVisual(azar, -0.2, 0.2) * pieza.alto, 0.09, 0.045, 0, 0, Math.PI * 2);
        c.stroke();
      }
    } else {
      c.globalAlpha = 0.55;
      for (let i = 0; i < 2; i++) {
        c.lineWidth = i === 0 ? 0.025 : 0.014;
        c.beginPath();
        let x = entreVisual(azar, -medioAncho, 0);
        let y = -medioAlto;
        c.moveTo(x, y);
        while (y < medioAlto) {
          x += entreVisual(azar, -0.05, 0.16);
          y += entreVisual(azar, 0.08, 0.16);
          c.lineTo(x, y);
        }
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  }

  private imagenPieza(pieza: Pieza, variante: Variante): ImagenPieza {
    let variantes = this.imagenes.get(pieza);
    if (!variantes) {
      variantes = new Map();
      this.imagenes.set(pieza, variantes);
    }
    const hecha = variantes.get(variante);
    if (hecha && hecha.escala === this.escala && hecha.tema === this.tema) return hecha;
    const nueva = this.crearImagenPieza(pieza, variante);
    variantes.set(variante, nueva);
    return nueva;
  }

  /**
   * Una pieza en dos pasadas: primero todas las sombras (`sombra`) y luego el
   * color y los ojos, para que ninguna sombra tape una pieza. `giroExtra` y
   * `pivote` (metros sobre el centro) inclinan la que cuelga desde el gancho.
   */
  private dibujarPieza(cuerpo: CuerpoVisible, ahora: number, sombra: boolean, giroExtra = 0, pivote = 0): void {
    const { ctx, tema } = this;
    const { pieza, x, y, angulo, cementada = false, especial } = cuerpo;
    // Cementada, cualquier pieza es piedra (también una especial): lo de abajo ya no se mueve.
    const imagen = this.imagenPieza(pieza, cementada ? "piedra" : (especial ?? "normal"));
    const deformacion = this.efectos?.deformacion(pieza, ahora) ?? { x: 1, y: 1 };
    ctx.save();
    ctx.translate(x + (sombra ? SOMBRA_X : 0), y + (sombra ? SOMBRA_Y : 0) + pivote);
    ctx.rotate(angulo + giroExtra);
    // Aplastar y estirar desde la base de la pieza.
    ctx.translate(0, -pivote - pieza.alto / 2);
    ctx.scale(deformacion.x, deformacion.y);
    ctx.translate(0, pieza.alto / 2);
    ctx.drawImage(sombra ? imagen.sombra : imagen.color, -imagen.ancho / 2, -imagen.alto / 2, imagen.ancho, imagen.alto);
    if (!sombra && especial && !cementada) {
      pintarOjosEspecial(ctx, pieza, especial);
      if (especial === "dorada") this.dibujarDestello(pieza, ahora);
    } else if (!sombra && tema.ojos && !cementada && (pieza.forma === "bloque" || pieza.forma === "cuadrado")) {
      this.dibujarOjos(pieza, ahora, Math.abs(angulo + giroExtra) > SUSTO, giroExtra);
    }
    ctx.restore();
  }

  /** Destello de la dorada (H3): una chispa de cuatro puntas que aparece y se va en una esquina, cada 1,4 s. */
  private dibujarDestello(pieza: Pieza, ahora: number): void {
    const fase = (ahora / 1400 + pieza.ancho) % 1;
    if (fase > 0.3) return;
    const { ctx } = this;
    const tam = Math.sin((fase / 0.3) * Math.PI) * Math.min(0.2, pieza.alto * 0.45);
    const x = -pieza.ancho / 2 + 0.1;
    const y = pieza.alto / 2 - 0.06;
    ctx.fillStyle = COLORES.papel;
    ctx.strokeStyle = COLORES.tinta;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x, y + tam);
    ctx.quadraticCurveTo(x, y, x + tam, y);
    ctx.quadraticCurveTo(x, y, x, y - tam);
    ctx.quadraticCurveTo(x, y, x - tam, y);
    ctx.quadraticCurveTo(x, y, x, y + tam);
    ctx.fill();
    ctx.stroke();
  }

  /** Ojos: parpadean, se cierran contentos en un perfecto y se abren mucho si la pieza se inclina. */
  private dibujarOjos(pieza: Pieza, ahora: number, asustada: boolean, mirada: number): void {
    const { ctx } = this;
    const vista = this.vista(pieza, ahora);
    if (ahora > vista.proximoParpadeo + 130) vista.proximoParpadeo = ahora + entreVisual(this.azar, 2000, 5000);
    const parpadea = ahora >= vista.proximoParpadeo;
    const contenta = ahora < vista.contentaHasta;
    const separacion = Math.min(0.22, pieza.ancho * 0.22);
    const alto = Math.min(pieza.alto * 0.14, 0.12);
    ctx.lineCap = "round";
    for (const lado of [-1, 1]) {
      const ox = lado * separacion;
      if (contenta) {
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.arc(ox, alto - RADIO_OJO * 0.6, RADIO_OJO, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      } else if (asustada) {
        ctx.fillStyle = COLORES.papel;
        ctx.beginPath();
        ctx.arc(ox, alto, RADIO_OJO * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 0.025;
        ctx.stroke();
        ctx.fillStyle = COLORES.tinta;
        ctx.beginPath();
        ctx.arc(ox, alto, RADIO_OJO * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (parpadea) {
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 0.035;
        ctx.beginPath();
        ctx.moveTo(ox - RADIO_OJO, alto);
        ctx.lineTo(ox + RADIO_OJO, alto);
        ctx.stroke();
      } else {
        // La pupila mira un poco hacia donde va la pieza que cuelga.
        const dx = Math.max(-0.02, Math.min(0.02, -mirada * 0.3));
        ctx.fillStyle = COLORES.tinta;
        ctx.beginPath();
        ctx.arc(ox + dx, alto, RADIO_OJO, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORES.papel;
        ctx.beginPath();
        ctx.arc(ox + dx + RADIO_OJO * 0.35, alto + RADIO_OJO * 0.35, RADIO_OJO * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Pieza que cuelga: cable de tinta, gancho amarillo, inclinación con el vaivén y guía sobre la cima. */
  private dibujarColgada(estado: EstadoPartida, arriba: number, ahora: number): void {
    const { ctx } = this;
    const colgada = estado.colgada!;
    const { pieza, x, y } = colgada;
    const antes = this.colgadaAntes;
    const dx = antes && antes.pieza === pieza ? x - antes.x : 0;
    this.colgadaAntes = { pieza, x };
    const inclinacionObjetivo = dx === 0 ? 0 : -Math.sign(dx) * INCLINACION_GANCHO;
    this.inclinacion += (inclinacionObjetivo - this.inclinacion) * 0.15;
    const ganchoY = y + pieza.alto / 2 + 0.22;

    // Guía tenue sobre la cima, en la x del objetivo.
    ctx.save();
    ctx.strokeStyle = COLORES.tinta;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 0.03;
    ctx.setLineDash([0.14, 0.14]);
    ctx.beginPath();
    ctx.moveTo(estado.objetivo, estado.altura + 0.1);
    ctx.lineTo(estado.objetivo, y - pieza.alto / 2 - 0.15);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = COLORES.tinta;
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(x, arriba);
    ctx.lineTo(x, ganchoY + 0.12);
    ctx.stroke();
    const cuerpo: CuerpoVisible = colgada.especial ? { pieza, x, y, angulo: 0, especial: colgada.especial } : { pieza, x, y, angulo: 0 };
    const pivote = ganchoY - y;
    this.dibujarPieza(cuerpo, ahora, true, this.inclinacion, pivote);
    this.dibujarPieza(cuerpo, ahora, false, this.inclinacion, pivote);
    // Gancho.
    ctx.fillStyle = COLORES.amarillo;
    ctx.strokeStyle = COLORES.tinta;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.rect(x - 0.13, ganchoY + 0.02, 0.26, 0.14);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, ganchoY + 0.02);
    ctx.lineTo(x, ganchoY - 0.2);
    ctx.stroke();
  }

  /** Mar delante de todo: lo que cae se hunde. Ondas de espuma que se mueven despacio. */
  private dibujarAgua(ctx: CanvasRenderingContext2D, ahora: number, abajo: number, izquierda: number, ancho: number): void {
    if (abajo > NIVEL_AGUA) return;
    if (this.escenario.mar === "nubes") {
      this.dibujarMarDeNubes(ctx, ahora, abajo, izquierda, ancho);
      return;
    }
    const t = ahora / 1000;
    ctx.fillStyle = this.escenario.agua;
    ctx.fillRect(izquierda, abajo, ancho, NIVEL_AGUA - abajo);
    ctx.strokeStyle = this.escenario.espuma;
    ctx.lineWidth = 0.05;
    ctx.lineCap = "round";
    for (const [fila, desfase] of [
      [0, 0],
      [0.35, 1.7],
      [0.75, 3.1],
    ] as const) {
      const yBase = NIVEL_AGUA - 0.05 - fila;
      if (yBase < abajo) break;
      ctx.globalAlpha = fila === 0 ? 0.9 : 0.45;
      ctx.beginPath();
      const paso = 0.9;
      const inicio = Math.floor(izquierda / paso) * paso;
      for (let x = inicio; x < izquierda + ancho; x += paso) {
        const fase = t * 0.8 + desfase + x * 0.7;
        const xo = x + Math.sin(fase) * 0.12 + (fila === 0.35 ? paso / 2 : 0);
        ctx.moveTo(xo - 0.22, yBase);
        ctx.quadraticCurveTo(xo, yBase + 0.08, xo + 0.22, yBase);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORES.tinta;
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(izquierda, NIVEL_AGUA);
    ctx.lineTo(izquierda + ancho, NIVEL_AGUA);
    ctx.stroke();
  }

  /** Mar de nubes (escenario Nubes): lomas de papel que se mueven despacio, con sombra. */
  private dibujarMarDeNubes(ctx: CanvasRenderingContext2D, ahora: number, abajo: number, izquierda: number, ancho: number): void {
    const t = ahora / 1000;
    const paso = 0.7;
    const lomas = (desfase: number, y: number, radio: number) => {
      ctx.beginPath();
      ctx.rect(izquierda, abajo, ancho, y - abajo);
      const deriva = (t * 0.12 + desfase) % paso;
      for (let x = Math.floor(izquierda / paso) * paso - paso; x < izquierda + ancho + paso; x += paso) {
        const r = radio * (0.8 + 0.2 * Math.sin(x * 1.7 + desfase * 5));
        ctx.moveTo(x + deriva + r, y);
        ctx.arc(x + deriva, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    };
    ctx.fillStyle = this.escenario.espuma;
    lomas(0.35, NIVEL_AGUA + 0.02 - 0.08, 0.34);
    ctx.fillStyle = this.escenario.agua;
    lomas(0, NIVEL_AGUA - 0.08, 0.3);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = this.escenario.espuma;
    lomas(0.2, NIVEL_AGUA - 0.6, 0.22);
    ctx.globalAlpha = 1;
  }
}
