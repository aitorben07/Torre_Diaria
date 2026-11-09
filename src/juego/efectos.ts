// Jugosidad (A3, Anexo 1, 1.5): aplastar y estirar, polvo, anillo y chispas
// del perfecto, textos emergentes, confeti, chapuzón, sacudida de cámara,
// corazón de vida extra, banda de hito y destello de récord. Las curvas son
// funciones puras (se prueban con Vitest). El azar visual tiene su propia
// semilla, distinta de la de la partida, y nada de aquí toca la simulación:
// cambiarlo no cambia puntos ni pasos.
import { MONEDAS_DORADA, type Especial } from "../logica/especiales.ts";
import type { Pieza } from "../logica/piezas.ts";
import type { Calidad } from "../logica/puntuacion.ts";
import type { CuerpoVisible } from "../logica/simulacion.ts";
import type { CapaEfectos } from "./dibujo.ts";
import { COLORES, ESPECIALES_DIBUJO, FAMILIA, TEMA_RISO } from "./temas.ts";

/** Generador mulberry32 de números en [0, 1). Solo para el dibujo. */
export function crearAzarVisual(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número en [min, max) con el azar visual. */
export function entreVisual(azar: () => number, min: number, max: number): number {
  return min + azar() * (max - min);
}

/** Tiempos y medidas del Anexo 1, 1.5. */
export const SACUDIDA_MS = 250;
/** Píxeles CSS de la sacudida al empezar. */
export const SACUDIDA_PX = 8;
export const ESTIRAR_MS = 80;
export const APLASTAR_MS = 160;
export const TEXTO_MS = 220;
export const PUNTOS_MS = 600;
export const BIEN_MS = 400;
export const VIDA_MS = 500;
export const HITO_MS = 700;
/** La ola de la pieza de cemento baja por la torre en este tiempo (H3). */
export const OLA_MS = 1300;
/** Metros que baja la ola como mucho: más abajo ya no se ve con la cámara en la cima. */
export const OLA_METROS = 8;
export const ESPECIAL_MS = 900;
export const MAX_PARTICULAS = 200;
/** Desde este combo hay confeti al colocar. */
export const COMBO_CONFETI = 3;

/** Curva «ease-out-back»: pasa un poco de 1 y vuelve. */
export function easeOutBack(t: number): number {
  const c = 1.70158;
  const u = Math.min(1, Math.max(0, t)) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

/** Desplazamiento de cámara de la sacudida a los `ms` de empezar: decae a 0 en `SACUDIDA_MS`. */
export function valorSacudida(ms: number, amplitud: number): { x: number; y: number } {
  if (ms < 0 || ms >= SACUDIDA_MS) return { x: 0, y: 0 };
  const queda = 1 - ms / SACUDIDA_MS;
  const fuerza = amplitud * queda * queda;
  return { x: fuerza * Math.sin(ms * 0.11), y: fuerza * Math.cos(ms * 0.087) };
}

/** Escala al aterrizar: de (1,12, 0,88) a (1, 1) en `APLASTAR_MS` con rebote. */
export function escalaAterrizaje(ms: number): { x: number; y: number } {
  if (ms < 0 || ms >= APLASTAR_MS) return { x: 1, y: 1 };
  const f = 1 - easeOutBack(ms / APLASTAR_MS);
  return { x: 1 + 0.12 * f, y: 1 - 0.12 * f };
}

/** Escala al soltar: de (0,94, 1,06) a (1, 1) en `ESTIRAR_MS`. */
export function escalaSoltar(ms: number): { x: number; y: number } {
  if (ms < 0 || ms >= ESTIRAR_MS) return { x: 1, y: 1 };
  const f = 1 - ms / ESTIRAR_MS;
  return { x: 1 - 0.06 * f, y: 1 + 0.06 * f };
}

/** Escala del texto «PERFECTO»: 0,6, 1,1 y 1 en `TEXTO_MS`. */
export function escalaTexto(ms: number): number {
  if (ms <= 0) return 0.6;
  if (ms >= TEXTO_MS) return 1;
  const mitad = TEXTO_MS * 0.6;
  return ms < mitad ? 0.6 + 0.5 * (ms / mitad) : 1.1 - 0.1 * ((ms - mitad) / (TEXTO_MS - mitad));
}

export type Particula = {
  tipo: "polvo" | "chispa" | "confeti" | "gota";
  x: number;
  y: number;
  vx: number;
  vy: number;
  giro: number;
  vgiro: number;
  tam: number;
  color: string;
  desde: number;
  vida: number;
};

/** Añade partículas sin pasar de `maximo`: si no caben, se van las más viejas. */
export function añadirParticulas(lista: Particula[], nuevas: Particula[], maximo: number = MAX_PARTICULAS): Particula[] {
  const todas = lista.concat(nuevas);
  return todas.length > maximo ? todas.slice(todas.length - maximo) : todas;
}

type Texto = { texto: string; x: number; y: number; desde: number; vida: number; tipo: "perfecto" | "bien" | "puntos" | "record" | "moneda" | "especial" };
/** Ola gris de la pieza de cemento: baja de `arriba` hasta `OLA_METROS` más abajo (o hasta 0), por el ancho de la torre. */
type Ola = { x: number; arriba: number; ancho: number; desde: number };
type Anillo = { x: number; y: number; desde: number };
type Corazon = { x: number; y: number; desde: number };

/** Tipos de efecto que se cuentan en `data-efectos` (solo para pruebas). */
export type TipoEfecto =
  | "soltada"
  | "aterrizaje"
  | "colocada-perfecto"
  | "colocada-bueno"
  | "colocada-normal"
  | "confeti"
  | "caida"
  | "chapuzon"
  | "vidaExtra"
  | "hito"
  | "record"
  | "especial-dorada"
  | "especial-pegajosa"
  | "especial-cemento";

export type OpcionesEfectos = {
  /** `prefers-reduced-motion: reduce`: sin sacudida ni destellos y la mitad de partículas. */
  reducido: () => boolean;
  /** Píxeles reales por píxel CSS. */
  ratio: () => number;
  /** ¿Se puede escribir ya con la fuente propia? */
  conFuente: () => boolean;
  /** Centro de los iconos de vidas del HUD, en píxeles reales del lienzo. */
  destinoVida: () => { x: number; y: number };
};

export class Efectos implements CapaEfectos {
  private particulas: Particula[] = [];
  private textos: Texto[] = [];
  private anillos: Anillo[] = [];
  /** Ondas del chapuzón en la superficie del mar. */
  private ondas: Anillo[] = [];
  private corazones: Corazon[] = [];
  private olas: Ola[] = [];
  private readonly deformaciones = new WeakMap<Pieza, { tipo: "soltar" | "aterrizar"; desde: number }>();
  private sacudidaDesde = -Infinity;
  private destelloDesde = -Infinity;
  private destelloColor: string = COLORES.papel;
  private hito: { texto: string; desde: number } | null = null;
  private ultimo = 0;
  private readonly azar = crearAzarVisual(0xef3c);
  /** Cuántas veces ha saltado cada efecto y la mayor sacudida aplicada (para `data-efectos`). */
  readonly contadores: Partial<Record<TipoEfecto, number>> & { sacudidaMax?: number } = {};
  /** Sube con cada cambio de `contadores`, para no reescribir el atributo en cada fotograma. */
  version = 0;

  constructor(private readonly opciones: OpcionesEfectos) {}

  private contar(tipo: TipoEfecto): void {
    this.contadores[tipo] = (this.contadores[tipo] ?? 0) + 1;
    this.version++;
  }

  /** Con movimiento reducido, la mitad de partículas. */
  private cuantas(n: number): number {
    return this.opciones.reducido() ? Math.ceil(n / 2) : n;
  }

  private emitir(nuevas: Particula[]): void {
    this.particulas = añadirParticulas(this.particulas, nuevas);
  }

  get vivas(): number {
    return this.particulas.length;
  }

  /** Vacía todo al empezar otra partida (los contadores siguen). */
  reiniciar(): void {
    this.particulas = [];
    this.textos = [];
    this.anillos = [];
    this.ondas = [];
    this.corazones = [];
    this.olas = [];
    this.hito = null;
    this.sacudidaDesde = -Infinity;
    this.destelloDesde = -Infinity;
  }

  soltada(pieza: Pieza, ahora: number): void {
    this.deformaciones.set(pieza, { tipo: "soltar", desde: ahora });
    this.contar("soltada");
  }

  /** La pieza toca la torre (o el muelle): aplastar, polvo y, según la calidad, anillo, chispas y texto. */
  aterrizaje(pieza: Pieza, x: number, y: number, calidad: Calidad, combo: number, ahora: number): void {
    this.deformaciones.set(pieza, { tipo: "aterrizar", desde: ahora });
    const base = y - pieza.alto / 2;
    const azar = this.azar;
    const polvo: Particula[] = [];
    for (let i = 0, n = this.cuantas(6 + Math.floor(azar() * 5)); i < n; i++) {
      const lado = i % 2 === 0 ? -1 : 1;
      polvo.push({
        tipo: "polvo",
        x: x + lado * pieza.ancho * entreVisual(azar, 0.3, 0.5),
        y: base + 0.04,
        vx: lado * entreVisual(azar, 0.6, 1.6),
        vy: entreVisual(azar, 0.2, 0.9),
        giro: 0,
        vgiro: 0,
        tam: entreVisual(azar, 0.05, 0.11),
        color: COLORES.papelOscuro,
        desde: ahora,
        vida: 300,
      });
    }
    this.emitir(polvo);
    this.contar("aterrizaje");
    if (calidad === "perfecto") {
      this.anillos.push({ x, y: base, desde: ahora });
      const chispas: Particula[] = [];
      for (let i = 0, n = this.cuantas(12); i < n; i++) {
        const angulo = (i / n) * Math.PI * 2 + azar() * 0.3;
        const v = entreVisual(azar, 2.5, 4.2);
        chispas.push({
          tipo: "chispa",
          x,
          y: base,
          vx: Math.cos(angulo) * v,
          vy: Math.sin(angulo) * v,
          giro: angulo,
          vgiro: 0,
          tam: entreVisual(azar, 0.12, 0.22),
          color: i % 3 === 0 ? COLORES.rosa : COLORES.amarillo,
          desde: ahora,
          vida: 320,
        });
      }
      this.emitir(chispas);
      this.textos.push({ texto: combo >= 2 ? `PERFECTO ×${combo}` : "PERFECTO", x, y: y + pieza.alto / 2 + 0.9, desde: ahora, vida: 900, tipo: "perfecto" });
    } else if (calidad === "bueno") {
      this.textos.push({ texto: "BIEN", x, y: y + pieza.alto / 2 + 0.6, desde: ahora, vida: BIEN_MS, tipo: "bien" });
    }
  }

  /** La pieza cuenta como colocada: «+N» y, desde combo 3, confeti. */
  colocada(calidad: Calidad, combo: number, puntos: number, x: number, y: number, ahora: number): void {
    this.contar(`colocada-${calidad}`);
    if (puntos > 0) this.textos.push({ texto: `+${puntos}`, x: x + 1.5, y: y - 0.2, desde: ahora, vida: PUNTOS_MS, tipo: "puntos" });
    if (calidad === "perfecto" && combo >= COMBO_CONFETI) {
      const azar = this.azar;
      const colores = TEMA_RISO.piezas;
      const confeti: Particula[] = [];
      for (let i = 0, n = this.cuantas(20); i < n; i++) {
        confeti.push({
          tipo: "confeti",
          x: x + entreVisual(azar, -0.4, 0.4),
          y: y + 0.6,
          vx: entreVisual(azar, -3, 3),
          vy: entreVisual(azar, 3, 6.5),
          giro: azar() * Math.PI,
          vgiro: entreVisual(azar, -12, 12),
          tam: entreVisual(azar, 0.1, 0.17),
          color: colores[i % colores.length]!,
          desde: ahora,
          vida: 1300,
        });
      }
      this.emitir(confeti);
      this.contar("confeti");
    }
  }

  /** Se pierde una vida: sacudida de cámara (salvo con movimiento reducido). */
  caida(ahora: number): void {
    if (!this.opciones.reducido()) this.sacudidaDesde = ahora;
    this.contar("caida");
  }

  /** Algo cae al mar (superficie en `y`): gotas. */
  chapuzon(x: number, y: number, ahora: number): void {
    const azar = this.azar;
    const gotas: Particula[] = [];
    for (let i = 0, n = this.cuantas(18); i < n; i++) {
      gotas.push({
        tipo: "gota",
        x: x + entreVisual(azar, -0.5, 0.5),
        y,
        vx: entreVisual(azar, -2, 2),
        vy: entreVisual(azar, 3, 6.5),
        giro: 0,
        vgiro: 0,
        tam: entreVisual(azar, 0.08, 0.16),
        color: i % 3 === 0 ? COLORES.papel : COLORES.azul,
        desde: ahora,
        vida: 700,
      });
    }
    this.emitir(gotas);
    this.ondas.push({ x, y, desde: ahora });
    this.contar("chapuzon");
  }

  /** Vida extra: el corazón vuela al HUD y un destello rosa. */
  vidaExtra(x: number, y: number, ahora: number): void {
    this.corazones.push({ x, y, desde: ahora });
    if (!this.opciones.reducido()) {
      this.destelloDesde = ahora;
      this.destelloColor = COLORES.rosa;
    }
    this.contar("vidaExtra");
  }

  /** Hito de altura: banda «¡15 m!» que cruza la pantalla. */
  hitoAltura(metros: number, ahora: number): void {
    this.hito = { texto: `¡${metros} m!`, desde: ahora };
    this.contar("hito");
  }

  /**
   * Una especial actúa (H3), con el centro de su pieza en (`x`, `y`): la dorada
   * brilla y suelta «+10» con una moneda; la pegajosa gotea miel y dice
   * «¡PEGADA!»; la de cemento lanza una ola gris que baja por la torre (sin ola
   * con movimiento reducido) y dice «¡A PIEDRA!».
   */
  especial(especial: Especial, pieza: Pick<Pieza, "ancho" | "alto">, x: number, y: number, ahora: number): void {
    const azar = this.azar;
    const arriba = y + pieza.alto / 2;
    if (especial === "dorada") {
      this.anillos.push({ x, y: arriba, desde: ahora });
      const chispas: Particula[] = [];
      for (let i = 0, n = this.cuantas(10); i < n; i++) {
        const angulo = (i / n) * Math.PI * 2 + azar() * 0.4;
        const v = entreVisual(azar, 1.6, 3);
        chispas.push({ tipo: "chispa", x, y, vx: Math.cos(angulo) * v, vy: Math.sin(angulo) * v, giro: angulo, vgiro: 0, tam: entreVisual(azar, 0.14, 0.24), color: i % 2 === 0 ? COLORES.amarillo : COLORES.papel, desde: ahora, vida: 420 });
      }
      this.emitir(chispas);
      // A la izquierda de la pieza: arriba va «PERFECTO» y a la derecha los puntos.
      this.textos.push({ texto: `+${MONEDAS_DORADA}`, x: x - pieza.ancho / 2 - 1.1, y, desde: ahora, vida: ESPECIAL_MS, tipo: "moneda" });
    } else if (especial === "pegajosa") {
      const gotas: Particula[] = [];
      for (let i = 0, n = this.cuantas(8); i < n; i++) {
        gotas.push({ tipo: "gota", x: x + entreVisual(azar, -0.45, 0.45) * pieza.ancho, y: y - pieza.alto / 2, vx: entreVisual(azar, -0.3, 0.3), vy: entreVisual(azar, -0.4, 0.6), giro: 0, vgiro: 0, tam: entreVisual(azar, 0.05, 0.09), color: ESPECIALES_DIBUJO.pegajosa.adorno, desde: ahora, vida: 650 });
      }
      this.emitir(gotas);
      this.textos.push({ texto: "¡PEGADA!", x, y: arriba + 0.7, desde: ahora, vida: ESPECIAL_MS, tipo: "especial" });
    } else {
      if (!this.opciones.reducido()) this.olas.push({ x, arriba, ancho: Math.max(2.4, pieza.ancho + 1), desde: ahora });
      // Bajo la cima: encima cae la pieza que se acaba de soltar, con su «PERFECTO».
      this.textos.push({ texto: "¡A PIEDRA!", x, y: Math.max(0.5, arriba - 1.6), desde: ahora, vida: ESPECIAL_MS * 1.4, tipo: "especial" });
    }
    this.contar(`especial-${especial}`);
  }

  /** Récord superado: destello y «¡RÉCORD!». */
  record(x: number, y: number, ahora: number): void {
    if (!this.opciones.reducido()) {
      this.destelloDesde = ahora;
      this.destelloColor = COLORES.amarillo;
    }
    this.textos.push({ texto: "¡RÉCORD!", x, y: y + 1.8, desde: ahora, vida: 1200, tipo: "record" });
    this.contar("record");
  }

  sacudida(ahora: number): { x: number; y: number } {
    if (this.opciones.reducido()) return { x: 0, y: 0 };
    const valor = valorSacudida(ahora - this.sacudidaDesde, SACUDIDA_PX * this.opciones.ratio());
    const tam = Math.hypot(valor.x, valor.y);
    if (tam > (this.contadores.sacudidaMax ?? 0) + 0.5) {
      this.contadores.sacudidaMax = Math.round(tam * 10) / 10;
      this.version++;
    }
    return valor;
  }

  deformacion(pieza: Pieza, ahora: number): { x: number; y: number } {
    const d = this.deformaciones.get(pieza);
    if (!d) return { x: 1, y: 1 };
    return d.tipo === "soltar" ? escalaSoltar(ahora - d.desde) : escalaAterrizaje(ahora - d.desde);
  }

  dibujarMundo(ctx: CanvasRenderingContext2D, ahora: number): void {
    const dt = Math.min(0.05, Math.max(0, (ahora - this.ultimo) / 1000));
    this.ultimo = ahora;
    // Ola de cemento: una banda gris que baja de la pieza a la plataforma, con su borde de tinta.
    this.olas = this.olas.filter((o) => ahora - o.desde < OLA_MS);
    for (const o of this.olas) {
      const t = (ahora - o.desde) / OLA_MS;
      const y = o.arriba - Math.min(o.arriba, OLA_METROS) * t;
      // Gris más oscuro que la piedra de la base, para que se vea al pasar por encima.
      ctx.globalAlpha = 0.8 * (1 - t * 0.5);
      ctx.fillStyle = ESPECIALES_DIBUJO.cemento.sombra;
      ctx.fillRect(o.x - o.ancho / 2, y - 0.35, o.ancho, 0.7);
      ctx.globalAlpha = 1 - t * 0.5;
      ctx.strokeStyle = COLORES.tinta;
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(o.x - o.ancho / 2, y);
      ctx.lineTo(o.x + o.ancho / 2, y);
      ctx.stroke();
    }
    // Anillos del perfecto: amarillo y, algo desplazado, uno fino de tinta (registro).
    this.anillos = this.anillos.filter((a) => ahora - a.desde < 380);
    for (const a of this.anillos) {
      const t = (ahora - a.desde) / 380;
      const r = 0.25 + 1.3 * easeOutBack(t * 0.9);
      ctx.globalAlpha = 1 - t * t;
      ctx.strokeStyle = COLORES.amarillo;
      ctx.lineWidth = 0.2 * (1 - t) + 0.05;
      ctx.beginPath();
      ctx.ellipse(a.x, a.y, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = COLORES.rosa;
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.ellipse(a.x + 0.06, a.y - 0.05, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.ondas = this.ondas.filter((o) => ahora - o.desde < 600);
    for (const o of this.ondas) {
      const t = (ahora - o.desde) / 600;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = COLORES.papel;
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, 0.3 + 1.4 * t, 0.08 + 0.2 * t, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.particulas = this.particulas.filter((p) => ahora - p.desde < p.vida);
    for (const p of this.particulas) {
      const t = (ahora - p.desde) / p.vida;
      if (p.tipo !== "chispa") p.vy -= (p.tipo === "polvo" ? 2 : 14) * dt;
      if (p.tipo === "confeti") {
        p.vx *= 1 - 1.5 * dt;
        p.vy = Math.max(p.vy, -2.2);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.giro += p.vgiro * dt;
      ctx.globalAlpha = p.tipo === "confeti" ? Math.min(1, (1 - t) * 3) : 1 - t;
      ctx.fillStyle = p.color;
      if (p.tipo === "chispa") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.05;
        ctx.lineCap = "round";
        const largo = p.tam * (1 - t);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(p.giro) * largo, p.y - Math.sin(p.giro) * largo);
        ctx.stroke();
      } else if (p.tipo === "confeti") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.tam * (p.tipo === "polvo" ? 1 + t : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  dibujarPantalla(ctx: CanvasRenderingContext2D, ahora: number, aPantalla: (x: number, y: number) => { x: number; y: number }): void {
    const { width, height } = ctx.canvas;
    const ratio = this.opciones.ratio();
    // Destello de vida extra o récord.
    const destello = (ahora - this.destelloDesde) / 300;
    if (destello >= 0 && destello < 1) {
      ctx.globalAlpha = 0.28 * (1 - destello);
      ctx.fillStyle = this.destelloColor;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
    // Corazones que vuelan al HUD.
    this.corazones = this.corazones.filter((c) => ahora - c.desde < VIDA_MS);
    if (this.corazones.length > 0) {
      const destino = this.opciones.destinoVida();
      for (const c of this.corazones) {
        const t = easeOutBack((ahora - c.desde) / VIDA_MS);
        const desde = aPantalla(c.x, c.y);
        const x = desde.x + (destino.x - desde.x) * t;
        const y = desde.y + (destino.y - desde.y) * t - Math.sin(Math.min(1, t) * Math.PI) * 60 * ratio;
        dibujarCorazon(ctx, x, y, 16 * ratio * (1.3 - 0.5 * Math.min(1, t)));
      }
    }
    if (!this.opciones.conFuente()) {
      this.textos = [];
      this.hito = null;
      return;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    this.textos = this.textos.filter((t) => ahora - t.desde < t.vida);
    for (const t of this.textos) {
      const ms = ahora - t.desde;
      const p = aPantalla(t.x, t.y);
      if (t.tipo === "puntos") {
        const f = ms / t.vida;
        ctx.globalAlpha = 1 - f * f;
        textoImpreso(ctx, t.texto, p.x, p.y - f * 40 * ratio, 22 * ratio, COLORES.tinta, COLORES.papel);
      } else if (t.tipo === "bien") {
        ctx.globalAlpha = 1 - ms / t.vida;
        textoImpreso(ctx, t.texto, p.x, p.y - (ms / t.vida) * 14 * ratio, 20 * ratio, COLORES.papel, COLORES.tinta);
      } else if (t.tipo === "moneda") {
        // «+10» de la dorada con una moneda dibujada a la izquierda.
        const f = ms / t.vida;
        const y = p.y - f * 50 * ratio;
        ctx.globalAlpha = Math.min(1, (1 - f) * 2.5);
        const px = 26 * ratio * escalaTexto(ms);
        dibujarMoneda(ctx, p.x - px * 1.15, y, px * 0.42);
        textoImpreso(ctx, t.texto, p.x + px * 0.35, y, px, COLORES.amarillo, COLORES.tinta);
      } else if (t.tipo === "especial") {
        const salida = Math.max(0, (ms - (t.vida - 200)) / 200);
        ctx.globalAlpha = 1 - salida;
        textoImpreso(ctx, t.texto, p.x, p.y - salida * 16 * ratio, 26 * ratio * escalaTexto(ms), COLORES.papel, COLORES.tinta);
      } else {
        const salida = Math.max(0, (ms - (t.vida - 200)) / 200);
        ctx.globalAlpha = 1 - salida;
        const tam = (t.tipo === "record" ? 40 : 34) * ratio * escalaTexto(ms);
        textoImpreso(ctx, t.texto, p.x, p.y - salida * 20 * ratio, tam, t.tipo === "record" ? COLORES.rosa : COLORES.amarillo, COLORES.tinta);
      }
    }
    ctx.globalAlpha = 1;
    // Banda del hito, de izquierda a derecha.
    if (this.hito) {
      const t = (ahora - this.hito.desde) / HITO_MS;
      if (t >= 1) this.hito = null;
      else {
        const alto = 54 * ratio;
        const y = height * 0.38;
        const ancho = Math.min(width, 520 * ratio);
        // Entra con rebote hasta el centro, se queda y sale acelerando.
        const f = t < 0.3 ? 0.5 * easeOutBack(t / 0.3) : t < 0.7 ? 0.5 : 0.5 + 0.5 * ((t - 0.7) / 0.3) ** 2;
        const x = -ancho + (width + ancho) * f;
        ctx.fillStyle = COLORES.tinta;
        ctx.fillRect(x + 6 * ratio, y - alto / 2 + 6 * ratio, ancho, alto);
        ctx.fillStyle = COLORES.rosa;
        ctx.fillRect(x, y - alto / 2, ancho, alto);
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 3 * ratio;
        ctx.strokeRect(x, y - alto / 2, ancho, alto);
        textoImpreso(ctx, this.hito.texto, x + ancho / 2, y, 34 * ratio, COLORES.papel, COLORES.tinta);
      }
    }
  }
}

/**
 * Texto «impreso»: borde grueso de `borde`, una copia en rosa algo desplazada
 * (fuera de registro) y el relleno encima.
 */
function textoImpreso(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, px: number, relleno: string, borde: string): void {
  ctx.font = `800 ${Math.round(px)}px ${FAMILIA}`;
  const desfase = Math.max(1, px * 0.06);
  ctx.lineWidth = Math.max(2, px * 0.16);
  ctx.strokeStyle = borde;
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = relleno === COLORES.rosa ? COLORES.amarillo : COLORES.rosa;
  ctx.fillText(texto, x + desfase, y + desfase);
  ctx.fillStyle = relleno;
  ctx.fillText(texto, x, y);
}

/** Moneda: círculo amarillo con sombra, contorno de tinta y un brillo, en píxeles. */
function dibujarMoneda(ctx: CanvasRenderingContext2D, x: number, y: number, radio: number): void {
  ctx.fillStyle = COLORES.tinta;
  ctx.beginPath();
  ctx.arc(x + radio * 0.18, y + radio * 0.18, radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORES.amarillo;
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORES.tinta;
  ctx.lineWidth = Math.max(1.5, radio * 0.16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, radio * 0.58, 0, Math.PI * 2);
  ctx.stroke();
}

/** Corazón dibujado con curvas (no es un carácter, G11), con contorno de tinta. */
export function dibujarCorazon(ctx: CanvasRenderingContext2D, x: number, y: number, tam: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + tam * 0.35);
  ctx.bezierCurveTo(x - tam * 1.1, y - tam * 0.3, x - tam * 0.5, y - tam * 1.05, x, y - tam * 0.45);
  ctx.bezierCurveTo(x + tam * 0.5, y - tam * 1.05, x + tam * 1.1, y - tam * 0.3, x, y + tam * 0.35);
  ctx.closePath();
  ctx.fillStyle = COLORES.tinta;
  ctx.save();
  ctx.translate(tam * 0.12, tam * 0.12);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORES.rosa;
  ctx.fill();
  ctx.strokeStyle = COLORES.tinta;
  ctx.lineWidth = Math.max(1.5, tam * 0.14);
  ctx.stroke();
}

type Seguida = { x: number; y: number; angulo: number; vx: number; vy: number; giro: number };
type Suelta = { cuerpo: CuerpoVisible; vx: number; vy: number; giro: number; mojada: boolean; desde: number };

/** Gravedad visual de las piezas retiradas, en m/s². */
const GRAVEDAD_VISUAL = 10;
/** Tiempo máximo que se sigue dibujando una pieza retirada. */
const SUELTA_MS = 3000;

/**
 * Piezas caídas que la simulación ya ha retirado (B1 las quita al cerrar el
 * episodio, a veces aún a la altura del muelle). Aquí siguen cayendo y girando
 * solo en pantalla, con la última velocidad que tenían, hasta hundirse en el
 * mar con un chapuzón. No cambian nada de la partida.
 */
export class Caidas {
  private seguidas = new Map<Pieza, Seguida>();
  private sueltas: Suelta[] = [];

  constructor(
    private readonly nivelAgua: number,
    private readonly alChapuzon: (x: number, ahora: number) => void,
  ) {}

  reiniciar(): void {
    this.seguidas = new Map();
    this.sueltas = [];
  }

  /** Tras avanzar `pasos` pasos de `pasoMs`: anota velocidades y suelta las piezas que ya no están. */
  observar(cuerpos: readonly CuerpoVisible[], pasos: number, pasoMs: number, ahora: number): void {
    const dt = (pasos * pasoMs) / 1000;
    const nuevas = new Map<Pieza, Seguida>();
    for (const c of cuerpos) {
      const antes = this.seguidas.get(c.pieza);
      nuevas.set(c.pieza, {
        x: c.x,
        y: c.y,
        angulo: c.angulo,
        vx: antes && dt > 0 ? (c.x - antes.x) / dt : 0,
        vy: antes && dt > 0 ? (c.y - antes.y) / dt : 0,
        giro: antes && dt > 0 ? (c.angulo - antes.angulo) / dt : 0,
      });
    }
    for (const [pieza, s] of this.seguidas) {
      if (nuevas.has(pieza)) continue;
      this.sueltas.push({ cuerpo: { pieza, x: s.x, y: s.y, angulo: s.angulo }, vx: s.vx, vy: Math.min(s.vy, -1), giro: s.giro, mojada: s.y - pieza.alto / 2 < this.nivelAgua, desde: ahora });
    }
    this.seguidas = nuevas;
  }

  /** Avanza las piezas sueltas y devuelve las que hay que dibujar. */
  avanzar(ahora: number, dtMs: number): CuerpoVisible[] {
    const dt = Math.min(0.05, Math.max(0, dtMs / 1000));
    this.sueltas = this.sueltas.filter((s) => ahora - s.desde < SUELTA_MS);
    for (const s of this.sueltas) {
      s.vy -= GRAVEDAD_VISUAL * dt;
      s.cuerpo.x += s.vx * dt;
      s.cuerpo.y += s.vy * dt;
      s.cuerpo.angulo += s.giro * dt;
      if (!s.mojada && s.cuerpo.y - s.cuerpo.pieza.alto / 2 < this.nivelAgua) {
        s.mojada = true;
        // En el agua se frenan y se hunden despacio.
        s.vx *= 0.3;
        s.vy *= 0.25;
        s.giro *= 0.3;
        this.alChapuzon(s.cuerpo.x, ahora);
      }
    }
    return this.sueltas.map((s) => s.cuerpo);
  }
}
