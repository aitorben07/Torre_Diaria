import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const paquete = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("package.json", () => {
  it("fija planck a una versión exacta, porque una actualización cambia las partidas", () => {
    expect(paquete.dependencies.planck).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("no usa React (D1)", () => {
    const todas = { ...paquete.dependencies, ...paquete.devDependencies };
    expect(Object.keys(todas).filter((nombre) => nombre.includes("react"))).toEqual([]);
  });
});

describe("textos de src/", () => {
  const raiz = new URL("./", import.meta.url);
  const archivos = (readdirSync(raiz, { recursive: true }) as string[])
    .map((ruta) => ruta.replaceAll("\\", "/"))
    .filter((ruta) => /\.(ts|astro|css)$/.test(ruta) && !ruta.endsWith(".test.ts"));

  it("la palabra «Práctica» ya no aparece: el modo se llama partida libre (B5)", () => {
    expect(archivos.length).toBeGreaterThan(5);
    expect(archivos.filter((ruta) => /pr[aá]ctica/i.test(readFileSync(new URL(ruta, raiz), "utf8")))).toEqual([]);
  });

  it("ningún icono es un carácter de texto: sin ★, ☆, ♥ ni → (G11)", () => {
    expect(archivos.filter((ruta) => /[★☆♥→]/.test(readFileSync(new URL(ruta, raiz), "utf8")))).toEqual([]);
  });
});
