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

  it("ningún código compara con las reglas actuales para saber si un día es de la v1 (R16)", () => {
    expect(archivos.filter((ruta) => /[!=]==\s*REGLAS\b/.test(readFileSync(new URL(ruta, raiz), "utf8")))).toEqual([]);
  });
});

describe("README y CI (H1, H2)", () => {
  const leer = (ruta: string) => readFileSync(new URL(ruta, new URL("../", import.meta.url)), "utf8");

  it("el README no dice que no haya CI ni repositorio, ni habla de «práctica»", () => {
    const readme = leer("README.md");
    expect(readme).not.toMatch(/sin CI|sin repositorio en GitHub|aún no está en GitHub/i);
    expect(readme).not.toMatch(/pr[aá]ctica/i);
    expect(readme).toContain("docs/diseno/diseno-juego.md");
    // Cada bloque de mediciones lleva fecha.
    for (const titulo of readme.match(/^### .+$/gm)!.filter((t) => /bloque/i.test(t))) expect(titulo).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("el CI corre en pull_request y al subir a main, con concurrency, 20 minutos y solo en repositorio público", () => {
    const ci = leer(".github/workflows/pruebas.yml");
    expect(ci).toMatch(/push:\n\s+branches: \[main\]/);
    expect(ci).toMatch(/\n\s+pull_request:/);
    expect(ci).toMatch(/concurrency:[\s\S]*cancel-in-progress: true/);
    expect(ci).toContain("timeout-minutes: 30");
    expect(ci).toContain("if: ${{ !github.event.repository.private }}");
    for (const paso of ["npm ci", "npm run check", "npm test", "npm run build", "npm run e2e"]) expect(ci).toContain(`run: ${paso}`);
  });
});
