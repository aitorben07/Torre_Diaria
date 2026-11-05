// Dibujo procedural en <canvas>: cielo en degradado que cambia con la altura,
// suelo, plataforma y piezas con un sombreado simple. Sin imágenes ni fuentes.
import { PALETA, verticesPieza } from "../logica/piezas.ts";
import { PLATAFORMA_ALTO, PLATAFORMA_MEDIO_ANCHO, type CuerpoVisible, type EstadoPartida } from "../logica/simulacion.ts";

/** Metros visibles a lo ancho y a lo alto: el ancho cubre todo el vaivén. */
export const ANCHO_VISTA = 9.2;
export const ALTO_VISTA = 13;
/** Metros de suelo visibles por debajo de la cara de la plataforma. */
const MARGEN_SUELO = 1.5;
/** La cámara deja la cima de la torre a esta distancia del borde inferior. */
const CIMA_SOBRE_SUELO = 5;
/** Altura a la que el cielo ya es noche. */
const ALTURA_CIELO = 60;
export const RATIO_MAXIMO = 2;

export function ratioPixeles(dispositivo: number): number {
  return Math.min(dispositivo > 0 ? dispositivo : 1, RATIO_MAXIMO);
}

export class Lienzo {
  private readonly ctx: CanvasRenderingContext2D;
  private escala = 1;
  private camaraY = 0;
  private cielo: CanvasGradient | null = null;
  private suelo: CanvasGradient | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no permite dibujar en <canvas>");
    this.ctx = ctx;
  }

  /** Ajusta los píxeles reales al tamaño CSS y crea los degradados (solo aquí, no por fotograma). */
  ajustar(): void {
    const ratio = ratioPixeles(window.devicePixelRatio);
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(width * ratio));
    this.canvas.height = Math.max(1, Math.round(height * ratio));
    this.escala = Math.min(this.canvas.width / ANCHO_VISTA, this.canvas.height / ALTO_VISTA);
    // Coordenadas «del mundo en píxeles»: y = 0 en la cara de la plataforma, hacia arriba negativo.
    this.cielo = this.ctx.createLinearGradient(0, 0, 0, -ALTURA_CIELO * this.escala);
    this.cielo.addColorStop(0, "#bfe3ff");
    this.cielo.addColorStop(0.25, "#6fb4ea");
    this.cielo.addColorStop(0.6, "#28508f");
    this.cielo.addColorStop(1, "#0b1030");
    this.suelo = this.ctx.createLinearGradient(0, 0, 0, MARGEN_SUELO * 2 * this.escala);
    this.suelo.addColorStop(0, "#6b8f3e");
    this.suelo.addColorStop(1, "#3d2b1f");
  }

  /** Coloca la cámara al empezar una partida. */
  reiniciarCamara(): void {
    this.camaraY = 0;
  }

  dibujar(estado: EstadoPartida | null): void {
    const { ctx, canvas, escala } = this;
    const objetivo = Math.max(0, (estado?.altura ?? 0) - CIMA_SOBRE_SUELO);
    this.camaraY += (objetivo - this.camaraY) * 0.08;
    const sueloY = canvas.height - (MARGEN_SUELO - this.camaraY) * escala;

    ctx.setTransform(1, 0, 0, 1, canvas.width / 2, sueloY);
    ctx.fillStyle = this.cielo ?? "#6fb4ea";
    ctx.fillRect(-canvas.width / 2, -sueloY, canvas.width, canvas.height);

    // Suelo y plataforma.
    ctx.fillStyle = this.suelo ?? "#3d2b1f";
    ctx.fillRect(-canvas.width / 2, PLATAFORMA_ALTO * escala, canvas.width, canvas.height);
    ctx.fillStyle = "#5b6470";
    ctx.fillRect(-PLATAFORMA_MEDIO_ANCHO * escala, 0, PLATAFORMA_MEDIO_ANCHO * 2 * escala, PLATAFORMA_ALTO * escala);
    ctx.fillStyle = "#8a95a3";
    ctx.fillRect(-PLATAFORMA_MEDIO_ANCHO * escala, 0, PLATAFORMA_MEDIO_ANCHO * 2 * escala, 0.12 * escala);

    if (!estado) return;
    for (const cuerpo of estado.cuerpos) this.dibujarPieza(cuerpo, 1);
    if (estado.colgada) {
      const { x, y, pieza } = estado.colgada;
      ctx.strokeStyle = "rgba(40, 40, 50, 0.7)";
      ctx.lineWidth = Math.max(1, 0.04 * escala);
      ctx.beginPath();
      ctx.moveTo(x * escala, -sueloY);
      ctx.lineTo(x * escala, -(y + pieza.alto / 2) * escala);
      ctx.stroke();
      this.dibujarPieza(estado.colgada, 0.92);
    }
  }

  private dibujarPieza({ pieza, x, y, angulo }: CuerpoVisible, opacidad: number): void {
    const { ctx, escala } = this;
    const vertices = verticesPieza(pieza);
    ctx.save();
    ctx.globalAlpha = opacidad;
    ctx.translate(x * escala, -y * escala);
    ctx.rotate(-angulo);
    ctx.beginPath();
    vertices.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x * escala, -v.y * escala) : ctx.lineTo(v.x * escala, -v.y * escala)));
    ctx.closePath();
    ctx.fillStyle = PALETA[pieza.color]?.relleno ?? "#cccccc";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = Math.max(1, 0.035 * escala);
    ctx.stroke();
    // Brillo: la misma forma, más pequeña y desplazada hacia arriba.
    ctx.beginPath();
    vertices.forEach((v, i) => {
      const px = v.x * 0.7 * escala;
      const py = -(v.y * 0.55 + pieza.alto * 0.12) * escala;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fill();
    ctx.restore();
  }
}
