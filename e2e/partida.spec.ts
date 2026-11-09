// T10 y G3: partida completa de principio a fin y equivalencia con `jugar` en
// Node, en partida libre y en el reto de hoy, con las reglas v2 (vidas,
// perfectos con imán y combos).
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { jugar } from "../src/logica/simulacion.ts";
import { conTactil, datosFin, DIA, empezarHoy, esperarLibre, jugarHastaElFin, preparar, SEMILLA } from "./ayudas.ts";

test("partida completa del reto de hoy tocando cada pieza en cuanto aparece", async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const vigilancia = await preparar(page);
  await page.goto("/");
  const inicio = Date.now();
  await empezarHoy(page);
  // Con toques de verdad (tap o clic), no soltados dentro de la página.
  await jugarHastaElFin(page, conTactil(testInfo), { real: true });
  const fin = await datosFin(page);
  expect(Date.now() - inicio).toBeLessThan(60_000);
  expect(fin.semilla).toBe(SEMILLA);
  // Piezas en el extremo: cada una cae y cuesta una vida; con tres, fin.
  expect(fin.toques.length).toBeGreaterThanOrEqual(3);

  await page.getByRole("button", { name: "Copiar" }).click();
  await expect(page.locator("#mensaje")).toHaveText("Copiado");
  const tarjeta = await page.evaluate(() => navigator.clipboard.readText());
  expect(tarjeta).toContain(`Torre Diaria #${DIA}`);

  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

/** Juega 4 piezas sobre el objetivo y el resto en el extremo, y compara con `jugar` en Node. */
async function compararConNode(page: Page, testInfo: TestInfo): Promise<void> {
  const inicio = Date.now();
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 4 });
  const fin = await datosFin(page);
  expect(Date.now() - inicio).toBeLessThan(60_000);
  expect(fin.opciones).toEqual({ vidas: 3 });

  const enNode = jugar(fin.semilla, fin.toques, fin.opciones);
  expect(enNode.terminada).toBe(true);
  expect(enNode.puntos).toBe(fin.puntos);
  // La altura se compara con tolerancia: Chrome y Node usan versiones de V8
  // con seno y coseno distintos y a veces difieren en el último decimal (README).
  expect(enNode.altura).toBeCloseTo(fin.altura, 9);
  testInfo.annotations.push({
    type: "altura",
    description: enNode.altura === fin.altura ? "idéntica en Node" : `Node ${enNode.altura} / pantalla ${fin.altura}`,
  });
  expect(enNode.piezas, `toques ${JSON.stringify(fin.toques)}`).toBeGreaterThanOrEqual(3);
  expect(enNode.formas).toHaveLength(enNode.piezas);
}

test("tocando sobre el objetivo, el reto de hoy en pantalla equivale a jugar() en Node", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await empezarHoy(page);
  await compararConNode(page, testInfo);
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("tocando sobre el objetivo, la partida libre en pantalla equivale a jugar() en Node", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await compararConNode(page, testInfo);
  expect(await page.locator("#juego").getAttribute("data-semilla")).toMatch(/^libre-[0-9a-z]+$/);
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});
