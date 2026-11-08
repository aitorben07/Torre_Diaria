// Pantalla Retos (D2): racha, mejor racha y congeladores arriba, con el botón
// de comprar congelador y el siguiente desbloqueo por racha; el calendario del
// mes (lunes primero) con el estado de cada día; y la ficha del día elegido.
// Todo el DOM se crea con `createElement` y `textContent`.
import { CONGELADOR, siguienteDesbloqueoRacha } from "../logica/catalogo.ts";
import { cuadriculaMes, estadoDia, MAX_CONGELADORES, medallaDe, mesVisible, rachaDeHoy } from "../logica/diarios.ts";
import type { Progreso } from "../logica/progreso.ts";
import { fechaDeDia } from "../logica/semilla.ts";
import { formatearAltura, formatearNumero, formatearPiezas, formatearPuntos } from "../logica/tarjeta.ts";
import { iconoMoneda } from "./coleccion.ts";
import { mostrarTexto, NOMBRE_MEDALLA, pintarMedalla } from "./pantallas.ts";

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** «20 de noviembre» del día `dia` del reto. */
export function nombreDia(dia: number): string {
  const fecha = fechaDeDia(dia);
  return `${Number(fecha.slice(8, 10))} de ${MESES[Number(fecha.slice(5, 7)) - 1]}`;
}

export type AccionesRetos = {
  jugar(dia: number): void;
  repetir(dia: number): void;
  compartir(dia: number): Promise<string>;
  comprarCongelador(): void;
};

const porId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class PanelRetos {
  /** 0: el mes de hoy; -1: el anterior. */
  private desplazamiento = 0;
  private elegido = 0;

  constructor(
    private readonly acciones: AccionesRetos,
    private readonly ultimo: () => { progreso: Progreso; hoy: number },
  ) {
    porId("mes-anterior").addEventListener("click", () => this.moverMes(-1));
    porId("mes-siguiente").addEventListener("click", () => this.moverMes(1));
    porId("ficha-jugar").addEventListener("click", () => this.acciones.jugar(this.elegido));
    porId("ficha-repetir").addEventListener("click", () => this.acciones.repetir(this.elegido));
    porId("ficha-compartir").addEventListener("click", async () => {
      porId("ficha-mensaje").textContent = await this.acciones.compartir(this.elegido);
    });
    porId("comprar-congelador").addEventListener("click", () => this.acciones.comprarCongelador());
  }

  /** Al abrir: el mes de hoy con hoy elegido. */
  abrir(): void {
    this.desplazamiento = 0;
    this.elegido = this.ultimo().hoy;
    this.pintar();
  }

  private moverMes(paso: number): void {
    this.desplazamiento = Math.min(0, this.desplazamiento + paso);
    this.pintar();
  }

  pintar(): void {
    const { progreso: p, hoy } = this.ultimo();
    this.pintarRacha(p, hoy);
    const mes = mesVisible(hoy, this.desplazamiento);
    this.desplazamiento = Math.min(0, this.desplazamiento);
    porId("mes-nombre").textContent = `${MESES[mes.mes - 1]} ${mes.anio}`;
    porId<HTMLButtonElement>("mes-anterior").disabled = mes.primero;
    porId<HTMLButtonElement>("mes-siguiente").disabled = mes.ultimo;
    const calendario = porId("calendario");
    calendario.replaceChildren(
      ...cuadriculaMes(mes.anio, mes.mes).map((casilla) => {
        if (!casilla || casilla.dia < 1) {
          const hueco = document.createElement("span");
          hueco.className = "hueco";
          if (casilla) hueco.textContent = String(casilla.diaDelMes);
          return hueco;
        }
        const { dia } = casilla;
        const estado = estadoDia(p, dia, hoy);
        const boton = document.createElement("button");
        boton.type = "button";
        boton.id = `dia-${dia}`;
        boton.className = `dia ${estado}${dia === hoy ? " hoy" : ""}${dia === this.elegido ? " elegido" : ""}`;
        boton.dataset.estadoDia = estado;
        boton.disabled = estado === "futuro";
        const numero = document.createElement("span");
        numero.textContent = String(casilla.diaDelMes);
        boton.append(numero);
        const jugado = p.diarios[dia];
        let etiqueta = `${nombreDia(dia)}, reto #${dia}`;
        if (jugado) {
          const medalla = medallaDe(jugado);
          const icono = document.createElement("span");
          pintarMedalla(icono, medalla);
          icono.setAttribute("aria-hidden", "true");
          boton.append(icono);
          etiqueta += `: ${medalla ? NOMBRE_MEDALLA[medalla].toLowerCase() : "jugado"}${jugado.enSuDia ? "" : ", atrasado"}`;
        } else if (estado === "sinJugar") {
          etiqueta += ": sin jugar";
        }
        boton.setAttribute("aria-label", etiqueta);
        boton.setAttribute("aria-pressed", String(dia === this.elegido));
        boton.addEventListener("click", () => {
          this.elegido = dia;
          porId("ficha-mensaje").textContent = "";
          this.pintar();
          // La ficha va encima del calendario: que se vea el día elegido.
          porId("ficha").scrollIntoView({ block: "nearest" });
        });
        return boton;
      }),
    );
    this.pintarFicha(p, hoy);
  }

  private pintarRacha(p: Progreso, hoy: number): void {
    const racha = rachaDeHoy(p, hoy);
    porId("racha-actual").textContent = String(racha);
    porId("racha-unidad").textContent = racha === 1 ? "día de racha" : "días de racha";
    porId("racha-mejor").textContent = `Mejor racha: ${p.racha.mejor}`;
    const congeladores = p.racha.congeladores;
    const caja = porId("congeladores");
    caja.setAttribute("aria-label", congeladores === 1 ? "1 congelador de racha" : `${congeladores} congeladores de racha`);
    [...caja.children].forEach((hueco, i) => hueco.classList.toggle("lleno", i < congeladores));
    const comprar = porId<HTMLButtonElement>("comprar-congelador");
    comprar.replaceChildren(document.createTextNode("Congelador "), iconoMoneda(), document.createTextNode(formatearNumero(CONGELADOR.precio)));
    comprar.setAttribute("aria-label", `Comprar congelador de racha por ${CONGELADOR.precio} monedas`);
    comprar.disabled = congeladores >= MAX_CONGELADORES || p.monedas < CONGELADOR.precio;
    const siguiente = siguienteDesbloqueoRacha(p);
    mostrarTexto(porId("racha-siguiente"), siguiente ? `Racha de ${siguiente.racha}: ${siguiente.nombre}` : null);
  }

  private pintarFicha(p: Progreso, hoy: number): void {
    const dia = this.elegido;
    const jugado = p.diarios[dia];
    porId("ficha-titulo").textContent = dia === hoy ? `Reto de hoy #${dia}` : `Reto #${dia} · ${nombreDia(dia)}`;
    const medalla = porId("ficha-medalla");
    medalla.hidden = !jugado;
    let texto: string;
    if (jugado) {
      const metal = medallaDe(jugado);
      pintarMedalla(medalla, metal);
      const marca = jugado.reglas === 1 ? formatearPiezas(jugado.piezas) : formatearPuntos(jugado.puntos);
      texto = `${metal ? `${NOMBRE_MEDALLA[metal]} · ` : ""}${marca} · ${formatearAltura(jugado.altura)}${jugado.enSuDia ? "" : " · atrasado"}`;
    } else {
      texto = dia === hoy ? "Sin jugar: suma racha" : "Sin jugar: da medalla y monedas, no suma racha";
    }
    porId("ficha-texto").textContent = texto;
    const jugar = porId<HTMLButtonElement>("ficha-jugar");
    jugar.hidden = !!jugado;
    jugar.textContent = dia === hoy ? "Jugar el reto de hoy" : `Jugar el día #${dia}`;
    porId("ficha-compartir").hidden = !jugado;
    porId("ficha-repetir").hidden = !jugado;
  }
}
