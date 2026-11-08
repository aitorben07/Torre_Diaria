// Dibujo procedural en <canvas> con la dirección de arte «Riso» (A2, Anexo 1,
// 1.3 y 1.4): piezas de tinta plana con contorno, sombra de impresión
// desplazada, color algo fuera de registro y trama de puntos; puerto con capas
// en paralaje, cielo que oscurece con la altura y grano de papel. Todo lo caro
// (degradado, tramas, capas, grano y la imagen de cada pieza) se crea al
// ajustar o la primera vez que hace falta, no por fotograma; el fondo se
// repinta solo cuando se mueve la cámara. El grano va en un elemento encima del
// lienzo, así que no cuesta nada por fotograma. Solo lee el estado de la
// partida: no cambia puntos ni pasos.
import { ALTO_MAX, verticesPieza, type Pieza } from "../logica/piezas.ts";
import {
  HUECO_COLGADA,
  PLATAFORMA_MEDIO_ANCHO,
  type CuerpoVisible,
  type EstadoPartida,
} from "../logica/simulacion.ts";
import { crearAzarVisual, entreVisual } from "./efectos.ts";
import { COLORES, ESCENARIO_PUERTO, FAMILIA, TEMA_RISO, mezclar, oscurecer, type Escenario, type Tema } from "./temas.ts";

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

export function ratioPixeles(dispositivo: number): number {
  return Math.min(dispositivo > 0 ? dispositivo : 1, RATIO_MAXIMO);
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

/** Lo que el dibujo recuerda de cada pieza: parpadeo y caras (A2) y deformación (A3). */
export type VistaPieza = {
  proximoParpadeo: number;
  /** Hasta cuándo cierra los ojos contenta (perfecto). */
  contentaHasta: number;
  escalaX: number;
  escalaY: number;
};

type ImagenPieza = { escala: number; tema: Tema; color: HTMLCanvasElement; sombra: HTMLCanvasElement; ancho: number; alto: number };

/** Decorado que aparece al subir (Anexo 1, 1.4). */
type Adorno = { tipo: "gaviota" | "globo" | "avion"; x: number; y: number; fase: number; color: string; velocidad: number };

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
  private readonly imagenes = new WeakMap<Pieza, { normal?: ImagenPieza; piedra?: ImagenPieza }>();
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

  /** `grano`: elemento sobre el lienzo que lleva la textura de papel como fondo CSS. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly grano: HTMLElement | null = null,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no permite dibujar en <canvas>");
    this.ctx = ctx;
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

  /** Cambia tema y escenario y rehace lo precalculado (el bloque C equipa otros). */
  cambiarTema(tema: Tema, escenario: Escenario): void {
    this.tema = tema;
    this.escenario = escenario;
    this.sombras = tema.piezas.map((color) => oscurecer(color, 0.35));
    this.canvas.dataset.tema = tema.id;
    if (this.ajustado) this.precalcular();
  }

  /**
   * Ajusta los píxeles reales al tamaño CSS y rehace degradado, tramas y capas
   * (solo aquí, no por fotograma). `columna` es el ancho CSS de la zona de
   * juego y `arriba` lo que tapa el HUD, ambos en píxeles CSS.
   */
  ajustar(columna?: number, arriba: number = 0): void {
    const ratio = ratioPixeles(window.devicePixelRatio);
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(width * ratio));
    this.canvas.height = Math.max(1, Math.round(height * ratio));
    this.columna = Math.max(1, Math.min(this.canvas.width, (columna ?? width) * ratio));
    this.arriba = Math.max(0, arriba * ratio);
    this.escala = Math.min(this.columna / ANCHO_VISTA, (this.canvas.height - this.arriba) / ALTO_VISTA);
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
    this.reserva = Math.max(0, pixelesCss) * ratioPixeles(window.devicePixelRatio);
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
    this.dibujarMuelle(c, abajo);
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

  /** Capa lejana (paralaje 0,3): grúas, contenedores, un faro y barcos en silueta. */
  private crearLejos(escala: number): HTMLCanvasElement {
    const alto = 3.6 * escala;
    const [aparte, c] = this.lienzoAparte(this.canvas.width, alto);
    const azar = crearAzarVisual(0x1e705);
    c.setTransform(escala, 0, 0, -escala, aparte.width / 2, aparte.height);
    const medio = aparte.width / 2 / escala;
    // Sol de dos tintas, amarillo y rosa algo desplazado, con franjas de papel abajo.
    c.globalAlpha = 0.9;
    c.fillStyle = COLORES.amarillo;
    c.beginPath();
    c.arc(-2.1, 1.25, 1.35, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.5;
    c.fillStyle = COLORES.rosa;
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
    return aparte;
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

  /** Muelle de madera: tablas, cara frontal con salvavidas y pilotes que bajan al agua. */
  private dibujarMuelle(ctx: CanvasRenderingContext2D, abajo: number): void {
    const { escenario } = this;
    const medio = PLATAFORMA_MEDIO_ANCHO;
    ctx.lineWidth = CONTORNO;
    ctx.strokeStyle = COLORES.tinta;
    ctx.fillStyle = escenario.pilotes;
    for (const x of [-medio + 0.11, -0.7, 0.7, medio - 0.11]) ctx.fillRect(x - 0.11, abajo, 0.22, -0.4 - abajo);
    // Sombra de impresión del muelle.
    ctx.fillStyle = COLORES.tinta;
    ctx.fillRect(-medio + SOMBRA_X, -0.44 + SOMBRA_Y, medio * 2, 0.44);
    ctx.fillStyle = escenario.maderaFrente;
    ctx.fillRect(-medio + REGISTRO_X, -0.44 + REGISTRO_Y, medio * 2, 0.32);
    ctx.fillStyle = escenario.madera;
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
  private crearImagenPieza(pieza: Pieza, piedra: boolean): ImagenPieza {
    const { escala, tema } = this;
    const ancho = pieza.ancho + 2 * MARGEN_IMAGEN;
    const alto = pieza.alto + 2 * MARGEN_IMAGEN;
    const ruta = this.ruta(pieza);
    const [color, c] = this.lienzoAparte(ancho * escala, alto * escala);
    const centro = () => c.setTransform(escala, 0, 0, escala, color.width / 2, color.height / 2);
    centro();
    c.translate(REGISTRO_X, REGISTRO_Y);
    c.fillStyle = piedra ? tema.piedra : (tema.piezas[pieza.color] ?? COLORES.papelOscuro);
    c.fill(ruta);
    if (this.trama) {
      this.trama.setTransform(new DOMMatrix().scale(1 / escala).rotate(45));
      c.save();
      c.clip(ruta);
      c.fillStyle = this.trama;
      c.fillRect(-pieza.ancho / 2, 0, pieza.ancho, pieza.alto / 2);
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
    c.strokeStyle = tema.contorno;
    c.lineWidth = CONTORNO;
    c.lineJoin = "round";
    c.stroke(ruta);
    const [sombra, s] = this.lienzoAparte(color.width, color.height);
    s.setTransform(escala, 0, 0, escala, sombra.width / 2, sombra.height / 2);
    s.fillStyle = piedra ? oscurecer(tema.piedra, 0.35) : (this.sombras[pieza.color] ?? COLORES.tinta);
    s.fill(ruta);
    return { escala, tema, color, sombra, ancho, alto };
  }

  private imagenPieza(pieza: Pieza, piedra: boolean): ImagenPieza {
    let par = this.imagenes.get(pieza);
    if (!par) {
      par = {};
      this.imagenes.set(pieza, par);
    }
    const hecha = piedra ? par.piedra : par.normal;
    if (hecha && hecha.escala === this.escala && hecha.tema === this.tema) return hecha;
    const nueva = this.crearImagenPieza(pieza, piedra);
    if (piedra) par.piedra = nueva;
    else par.normal = nueva;
    return nueva;
  }

  /**
   * Una pieza en dos pasadas: primero todas las sombras (`sombra`) y luego el
   * color y los ojos, para que ninguna sombra tape una pieza. `giroExtra` y
   * `pivote` (metros sobre el centro) inclinan la que cuelga desde el gancho.
   */
  private dibujarPieza(cuerpo: CuerpoVisible, ahora: number, sombra: boolean, giroExtra = 0, pivote = 0): void {
    const { ctx, tema } = this;
    const { pieza, x, y, angulo, cementada = false } = cuerpo;
    const imagen = this.imagenPieza(pieza, cementada);
    const deformacion = this.efectos?.deformacion(pieza, ahora) ?? { x: 1, y: 1 };
    ctx.save();
    ctx.translate(x + (sombra ? SOMBRA_X : 0), y + (sombra ? SOMBRA_Y : 0) + pivote);
    ctx.rotate(angulo + giroExtra);
    // Aplastar y estirar desde la base de la pieza.
    ctx.translate(0, -pivote - pieza.alto / 2);
    ctx.scale(deformacion.x, deformacion.y);
    ctx.translate(0, pieza.alto / 2);
    ctx.drawImage(sombra ? imagen.sombra : imagen.color, -imagen.ancho / 2, -imagen.alto / 2, imagen.ancho, imagen.alto);
    if (!sombra && tema.ojos && !cementada && (pieza.forma === "bloque" || pieza.forma === "cuadrado")) {
      this.dibujarOjos(pieza, ahora, Math.abs(angulo + giroExtra) > SUSTO, giroExtra);
    }
    ctx.restore();
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
    const cuerpo: CuerpoVisible = { pieza, x, y, angulo: 0 };
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
}
