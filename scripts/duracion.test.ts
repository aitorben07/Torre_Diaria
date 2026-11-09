import { describe, expect, it } from "vitest";
import { jugarConPerfil, medirPerfil, PERFILES } from "./duracion.ts";

const perfil = (nombre: string) => PERFILES.find((p) => p.nombre === nombre)!;
const novato = perfil("novato");
const medio = perfil("medio");

describe("jugadores simulados (B4)", () => {
  it("hay tres perfiles: novato ±180 ms, medio ±90 ms y experto ±40 ms", () => {
    expect(PERFILES.map((p) => [p.nombre, p.errorMs])).toEqual([
      ["novato", 180],
      ["medio", 90],
      ["experto", 40],
    ]);
  });

  it("el mismo día y perfil dan siempre la misma partida", () => {
    expect(jugarConPerfil("2026-11-05", novato)).toEqual(jugarConPerfil("2026-11-05", novato));
  });

  it("mide el arranque: primera suelta, cadencia de las sueltas 1 a 10 y décima colocada (B2)", () => {
    const m = jugarConPerfil("2026-11-05", medio);
    expect(m.primeraS).not.toBeNull();
    expect(m.cadenciaS).not.toBeNull();
    expect(m.decimaS).not.toBeNull();
    expect(m.primeraS!).toBeGreaterThan(0);
    // La décima se coloca tras la primera suelta y unas nueve cadencias (con margen).
    expect(m.decimaS!).toBeGreaterThan(m.primeraS! + 9 * m.cadenciaS! * 0.5);
  });

  it("en 3 días, el novato dura de 60 a 150 s de mediana y el medio de 120 a 300 s, más y con más puntos", () => {
    // La medición completa (30 días y el experto) es `npm run medir:duracion`.
    const deNovato = medirPerfil(novato, 3);
    const deMedio = medirPerfil(medio, 3);
    expect(deNovato.medianaS).toBeGreaterThanOrEqual(60);
    expect(deNovato.medianaS).toBeLessThanOrEqual(150);
    expect(deMedio.medianaS).toBeGreaterThanOrEqual(120);
    expect(deMedio.medianaS).toBeLessThanOrEqual(300);
    expect(deMedio.medianaPuntos).toBeGreaterThan(deNovato.medianaPuntos);
    // Ninguna llega al tope de 30 minutos.
    for (const medida of [...deNovato.medidas, ...deMedio.medidas]) expect(medida.terminada).toBe(true);
  }, 60_000);
});
