// T10 y G3: partida completa de principio a fin y equivalencia con `jugar` en
// Node, en partida libre y en el reto de hoy, con las reglas actuales (vidas,
// perfectos con imán y combos).
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { jugar } from "../src/logica/simulacion.ts";
import { PASO_MS } from "../src/juego/bucle.ts";
import { conTactil, datosFin, DIA, empezarHoy, esperarFinListo, juego, jugarHastaElFin, jugarLibre, pausar, preparar, SEMILLA } from "./ayudas.ts";

/**
 * Segundos de juego de la partida, por sus pasos (60 por segundo). Se mide así
 * y no con el reloj de la prueba: con el equipo cargado la partida va más lenta
 * (como mucho 5 pasos por fotograma) y una de 50 s de juego tardaba 67 s.
 */
async function segundosDeJuego(page: Page): Promise<number> {
  return (Number(await juego(page).getAttribute("data-pasos")) * PASO_MS) / 1000;
}

test("partida completa del reto de hoy tocando cada pieza en cuanto aparece", async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await empezarHoy(page);
  // Con toques de verdad (tap o clic), no soltados dentro de la página.
  await jugarHastaElFin(page, conTactil(testInfo), { real: true });
  const fin = await datosFin(page);
  expect(await segundosDeJuego(page)).toBeLessThan(60);
  expect(fin.semilla).toBe(SEMILLA);
  // Piezas en el extremo: cada una cae y cuesta una vida; con tres, fin.
  expect(fin.toques.length).toBeGreaterThanOrEqual(3);

  // «Copiar» ignora los primeros 700 ms del fin.
  await esperarFinListo(page);
  await page.getByRole("button", { name: "Copiar" }).click();
  await expect(page.locator("#mensaje")).toHaveText("Copiado");
  const tarjeta = await page.evaluate(() => navigator.clipboard.readText());
  expect(tarjeta).toContain(`Torre Diaria #${DIA}`);

  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

/** Juega 4 piezas sobre el objetivo y el resto en el extremo, y compara con `jugar` en Node. */
async function compararConNode(page: Page, testInfo: TestInfo, modo: "libre" | "reto"): Promise<void> {
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 4 });
  const fin = await datosFin(page);
  expect(await segundosDeJuego(page)).toBeLessThan(60);
  expect(fin.opciones).toEqual({ vidas: 3, modo });
  // Sin barra de objetos todavía (I3), la lista de ayudas va vacía, pero ya se repite con ella (I1, R3).
  expect(fin.ayudas).toEqual([]);

  const enNode = jugar(fin.semilla, fin.toques, { ...fin.opciones, ayudas: fin.ayudas });
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
  await compararConNode(page, testInfo, "reto");
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("tocando sobre el objetivo, la partida libre con una pausa en medio equivale a jugar() en Node (R3, E3)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  // Una pausa a mitad del vaivén de la primera pieza: la pieza se queda quieta y sigue al volver.
  await expect.poll(async () => Number(await page.locator("#juego").getAttribute("data-pasos"))).toBeGreaterThan(20);
  await pausar(page);
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.locator("#juego")).toHaveAttribute("data-estado", "jugando");
  await compararConNode(page, testInfo, "libre");
  expect(await page.locator("#juego").getAttribute("data-semilla")).toMatch(/^libre-[0-9a-z]+$/);
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});
