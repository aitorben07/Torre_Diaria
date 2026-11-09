import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aplicarLlamadas, anunciosDePlataforma, anunciosNulos, llamadasAlAbrir, llamadasDeTransicion, type Anuncios, type TipoAnuncio } from "./anuncios.ts";
import { abrir, ESPERA_FIN_MS, transicion, type Accion, type Contexto, type Flujo } from "./flujo.ts";

const HOY = 16;

/** Anuncios falsos que cuentan las llamadas; `listos` dice qué tipos están disponibles. */
function contador(listos: TipoAnuncio[] = []) {
  const llamadas: string[] = [];
  const anuncios: Anuncios = {
    disponible: (tipo) => listos.includes(tipo),
    intersticial: (motivo) => {
      llamadas.push(`intersticial:${motivo}`);
      return Promise.resolve();
    },
    recompensado: (motivo) => {
      llamadas.push(`recompensado:${motivo}`);
      return Promise.resolve("visto");
    },
    partidaEmpieza: () => void llamadas.push("partidaEmpieza"),
    partidaPara: () => void llamadas.push("partidaPara"),
  };
  return { anuncios, llamadas };
}

/** Recorre el flujo con las acciones dadas, como `principal.ts`, aplicando las llamadas de cada transición. */
function recorrer(anuncios: Anuncios, inicio: { flujo: Flujo; orden: import("./flujo.ts").Orden }, acciones: Accion[], jugados: number[] = []): string[] {
  const ordenes: string[] = [];
  let flujo = inicio.flujo;
  aplicarLlamadas(anuncios, llamadasAlAbrir(inicio.orden), () => ordenes.push(inicio.orden.tipo));
  let ahora = 0;
  for (const accion of acciones) {
    ahora += ESPERA_FIN_MS + 1;
    const contexto: Contexto = { ahora, hoy: HOY, jugado: (dia) => jugados.includes(dia), nivelDisponible: (n) => n <= 2 };
    const antes = flujo;
    const siguiente = transicion(flujo, accion, contexto);
    flujo = siguiente.flujo;
    aplicarLlamadas(anuncios, llamadasDeTransicion(antes, siguiente.flujo, accion, siguiente.orden), () => ordenes.push(siguiente.orden.tipo));
  }
  return ordenes;
}

describe("huecos de anuncios (G1)", () => {
  it("anunciosNulos no tiene nada disponible y resuelve al momento", async () => {
    expect(anunciosNulos.disponible("intersticial")).toBe(false);
    expect(anunciosNulos.disponible("recompensado")).toBe(false);
    await expect(anunciosNulos.intersticial("otra-vez")).resolves.toBeUndefined();
    await expect(anunciosNulos.recompensado("seguir")).resolves.toBe("cancelado");
    expect(anunciosDePlataforma("web")).toBe(anunciosNulos);
    expect(anunciosDePlataforma(undefined)).toBe(anunciosNulos);
  });

  it("una partida libre completa y «Otra vez»: partidaEmpieza 2 veces, partidaPara 1 vez e intersticial(otra-vez) 1 vez", () => {
    const { anuncios, llamadas } = contador();
    recorrer(anuncios, abrir(null, HOY), [{ tipo: "terminar" }, { tipo: "libre" }]);
    expect(llamadas).toEqual(["partidaEmpieza", "partidaPara", "intersticial:otra-vez", "partidaEmpieza"]);
  });

  it("el reto diario no pide intersticial ni recompensado («seguir» nunca)", () => {
    const { anuncios, llamadas } = contador(["intersticial", "recompensado"]);
    const ordenes = recorrer(anuncios, abrir({ dia: HOY, puntos: 50 }, HOY), [
      { tipo: "jugarReto", reto: { dia: HOY, puntos: 50 } },
      { tipo: "terminar" },
      { tipo: "repetirDia", dia: HOY },
      { tipo: "terminar" },
    ], [HOY]);
    expect(ordenes).toContain("resultado");
    expect(llamadas.filter((l) => l.startsWith("recompensado") || l.startsWith("intersticial"))).toEqual([]);
  });

  it("pausar con un panel encima llama a partidaPara y seguir, a partidaEmpieza; «Siguiente nivel» pide su intersticial", () => {
    const { anuncios, llamadas } = contador();
    recorrer(anuncios, abrir(null, HOY), [
      { tipo: "abrir", panel: "niveles" },
      { tipo: "cerrar" },
      { tipo: "abrir", panel: "niveles" },
      { tipo: "jugarNivel", nivel: 1 },
      { tipo: "terminar" },
      { tipo: "siguienteNivel" },
    ]);
    expect(llamadas).toEqual([
      "partidaEmpieza",
      "partidaPara",
      "partidaEmpieza",
      "partidaPara",
      "partidaEmpieza",
      "partidaPara",
      "intersticial:siguiente-nivel",
      "partidaEmpieza",
    ]);
  });

  it("sin intersticial disponible la orden se ejecuta en el mismo instante; con uno, al acabar el anuncio", async () => {
    const sinAnuncio = contador();
    let empezada = false;
    aplicarLlamadas(sinAnuncio.anuncios, { antes: [{ tipo: "intersticial", motivo: "otra-vez" }], despues: [] }, () => (empezada = true));
    expect(empezada).toBe(true);

    const conAnuncio = contador(["intersticial"]);
    let despues = false;
    aplicarLlamadas(conAnuncio.anuncios, { antes: [{ tipo: "intersticial", motivo: "otra-vez" }], despues: [{ tipo: "partidaEmpieza" }] }, () => (despues = true));
    expect(despues).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(despues).toBe(true);
    expect(conAnuncio.llamadas).toEqual(["intersticial:otra-vez", "partidaEmpieza"]);
  });

  it("el código no carga ningún SDK de anuncios", () => {
    const carpeta = new URL("./", import.meta.url);
    for (const archivo of readdirSync(carpeta).filter((a) => a.endsWith(".ts") && !a.endsWith(".test.ts"))) {
      expect(readFileSync(new URL(archivo, carpeta), "utf8"), archivo).not.toMatch(/crazygames|poki|googlesyndication|adsbygoogle/i);
    }
  });
});
