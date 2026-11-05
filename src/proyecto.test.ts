import { readFileSync } from "node:fs";
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
