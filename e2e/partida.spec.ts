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

test("tocando sobre el centro, la partida en pantalla equivale a jugar() en Node", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  const inicio = Date.now();
  await empezarHoy(page);
  // Las cuatro primeras piezas se tocan al pasar cerca del centro; las demás, en el extremo.
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 4 });
  const fin = await datosFin(page);
  expect(Date.now() - inicio).toBeLessThan(60_000);

  const enNode = jugar(fin.semilla, fin.toques);
  expect(enNode.terminada).toBe(true);
  expect(enNode.puntos).toBe(fin.puntos);
  // La altura se compara con tolerancia: Chrome y Node usan versiones de V8
  // con seno y coseno distintos y a veces difieren en el último decimal (README).
  expect(enNode.altura).toBeCloseTo(fin.altura, 9);
  testInfo.annotations.push({
    type: "altura",
    description: enNode.altura === fin.altura ? "idéntica en Node" : `Node ${enNode.altura} / pantalla ${fin.altura}`,
  });
  expect(fin.puntos, `toques ${JSON.stringify(fin.toques)}`).toBeGreaterThanOrEqual(3);

  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});
