// T10: partida completa de principio a fin y equivalencia con `jugar` en Node.
import { expect, test } from "@playwright/test";
import { jugar } from "../src/logica/simulacion.ts";
import { conTactil, datosFin, DIA, empezarHoy, jugarHastaElFin, preparar, SEMILLA } from "./ayudas.ts";

test("partida completa tocando cada pieza en cuanto aparece", async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const vigilancia = await preparar(page);
  await page.goto("/");
  const inicio = Date.now();
  await empezarHoy(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  const fin = await datosFin(page);
  expect(Date.now() - inicio).toBeLessThan(60_000);
  expect(fin.semilla).toBe(SEMILLA);

  await page.getByRole("button", { name: "Copiar" }).click();
  await expect(page.locator("#mensaje")).toHaveText("Copiado");
  const tarjeta = await page.evaluate(() => navigator.clipboard.readText());
  expect(tarjeta).toContain(`Torre Diaria #${DIA}`);

  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("con retraso, la partida en pantalla equivale a jugar() en Node", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  const inicio = Date.now();
  await empezarHoy(page);
  // Las cuatro primeras piezas se tocan cerca del centro; la quinta, en el extremo.
  await jugarHastaElFin(page, conTactil(testInfo), { conRetraso: 4, retrasoMs: 1600 });
  const fin = await datosFin(page);
  expect(Date.now() - inicio).toBeLessThan(60_000);

  const enNode = jugar(fin.semilla, fin.toques);
  expect(enNode.terminada).toBe(true);
  expect(enNode.puntos).toBe(fin.puntos);
  expect(enNode.altura).toBe(fin.altura);
  expect(fin.puntos).toBeGreaterThanOrEqual(3);

  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});
