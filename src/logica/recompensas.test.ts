import { describe, expect, it } from "vitest";
import { anunciosSimulados } from "../juego/anuncios.ts";
import { progresoVacio, type Progreso } from "./progreso.ts";
import {
  cobrarObjetoVideo,
  cobrarVideoMonedas,
  corregirReloj,
  esperaVideoMonedas,
  HORAS_VIDEO,
  MONEDAS_VIDEO,
  objetoVideoDisponible,
  textoEspera,
  videoMonedasDisponible,
} from "./recompensas.ts";

const HORA = 3_600_000;
const MINUTO = 60_000;
/** 2026-11-10 a las 10:00 UTC. */
const T0 = Date.UTC(2026, 10, 10, 10);

const conTodo = (): Progreso => {
  const p = progresoVacio();
  return { ...p, objetos: { ...p.objetos, desbloqueados: ["reloj", "cemento", "corazon"] } };
};

/** Como la página: pide el vídeo y solo con «visto» da el premio. */
async function verVideoMonedas(p: Progreso, ahora: number, resultado: "visto" | "cancelado" | "error"): Promise<Progreso> {
  const anuncios = anunciosSimulados(() => Promise.resolve(resultado));
  if (!anuncios.disponible("recompensado") || !videoMonedasDisponible(p, ahora)) return p;
  return (await anuncios.recompensado("monedas")) === "visto" ? cobrarVideoMonedas(p, ahora) : p;
}

describe("vídeo de monedas (K2)", () => {
  it("ver el vídeo suma 60; a las 3 h 59 min no está disponible y dice «Disponible en 1 min»; a las 4 h, sí", async () => {
    const p = await verVideoMonedas(progresoVacio(), T0, "visto");
    expect(p.monedas).toBe(MONEDAS_VIDEO);
    expect(MONEDAS_VIDEO).toBe(60);
    expect(HORAS_VIDEO).toBe(4);
    const casi = T0 + 3 * HORA + 59 * MINUTO;
    expect(videoMonedasDisponible(p, casi)).toBe(false);
    expect(textoEspera(esperaVideoMonedas(p, casi))).toBe("Disponible en 1 min");
    expect(cobrarVideoMonedas(p, casi)).toBe(p);
    expect(videoMonedasDisponible(p, T0 + 4 * HORA)).toBe(true);
    expect((await verVideoMonedas(p, T0 + 4 * HORA, "visto")).monedas).toBe(2 * MONEDAS_VIDEO);
  });

  it("con «cancelado» o «error» no se suma nada y el vídeo sigue disponible", async () => {
    for (const resultado of ["cancelado", "error"] as const) {
      const p = await verVideoMonedas(progresoVacio(), T0, resultado);
      expect(p.monedas, resultado).toBe(0);
      expect(videoMonedasDisponible(p, T0)).toBe(true);
    }
  });

  it("con la hora guardada en el futuro, vuelve a estar disponible como mucho 4 h después de la hora actual", () => {
    const p = { ...progresoVacio(), recompensas: { ultimoVideoMonedas: T0 + 30 * 24 * HORA, diaObjetoVideo: 0, objetosVideo: 0 } };
    expect(esperaVideoMonedas(p, T0)).toBe(4 * HORA);
    const corregido = corregirReloj(p, T0);
    expect(corregido.recompensas.ultimoVideoMonedas).toBe(T0);
    expect(videoMonedasDisponible(corregido, T0 + 4 * HORA)).toBe(true);
    expect(corregirReloj(corregido, T0 + HORA)).toBe(corregido);
  });

  it("textos de espera", () => {
    expect(textoEspera(1)).toBe("Disponible en 1 min");
    expect(textoEspera(60 * MINUTO)).toBe("Disponible en 1 h");
    expect(textoEspera(3 * HORA + 59 * MINUTO)).toBe("Disponible en 3 h 59 min");
  });
});

describe("objeto gratis con vídeo (K2)", () => {
  it("uno por día UTC: el segundo, el mismo día, no se ofrece; pasada la medianoche UTC, sí", () => {
    const p = cobrarObjetoVideo(conTodo(), T0, "reloj");
    expect(p.objetos.reloj).toBe(1);
    const tarde = Date.UTC(2026, 10, 10, 23, 59);
    expect(objetoVideoDisponible(p, tarde, "cemento")).toBe(false);
    expect(cobrarObjetoVideo(p, tarde, "cemento")).toBe(p);
    const manana = Date.UTC(2026, 10, 11, 0, 0, 1);
    expect(objetoVideoDisponible(p, manana, "cemento")).toBe(true);
    expect(cobrarObjetoVideo(p, manana, "cemento").objetos.cemento).toBe(1);
  });

  it("no se ofrece un objeto bloqueado ni uno que ya está al máximo", () => {
    expect(objetoVideoDisponible(progresoVacio(), T0, "reloj")).toBe(false);
    const lleno = conTodo();
    lleno.objetos.corazon = 9;
    expect(objetoVideoDisponible(lleno, T0, "corazon")).toBe(false);
  });

  it("con el día guardado en el futuro cuenta como usado hoy, y al corregir el reloj se ofrece mañana", () => {
    const p = { ...conTodo(), recompensas: { ultimoVideoMonedas: 0, diaObjetoVideo: 99_999, objetosVideo: 1 } };
    expect(objetoVideoDisponible(p, T0, "reloj")).toBe(false);
    const corregido = corregirReloj(p, T0);
    expect(objetoVideoDisponible(corregido, T0 + 24 * HORA, "reloj")).toBe(true);
  });
});
