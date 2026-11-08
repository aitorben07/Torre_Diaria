// T8: pantalla de juego, entrada de un toque y nitidez del lienzo.
import { expect, test } from "@playwright/test";
import { conTactil, datosFin, esperarLibre, juego, jugarHastaElFin, preparar, tocar } from "./ayudas.ts";

test("un toque o un clic sobre el lienzo suelta la pieza", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-fase", "apuntando");
  await tocar(page, conTactil(testInfo));
  await expect(juego(page)).not.toHaveAttribute("data-fase", "apuntando");
});

test("en escritorio la tecla Espacio suelta la pieza", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo en escritorio");
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-fase", "apuntando");
  await page.keyboard.press("Space");
  await expect(juego(page)).not.toHaveAttribute("data-fase", "apuntando");
});

test("en 390×844 no hay desplazamiento horizontal", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  await page.goto("/");
  for (const paso of ["jugando", "fin"]) {
    if (paso === "fin") await jugarHastaElFin(page, conTactil(testInfo));
    const { ancho, vista } = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      vista: window.innerWidth,
    }));
    expect(ancho).toBeLessThanOrEqual(vista);
  }
});

for (const ratio of [1, 3]) {
  test(`el lienzo usa min(devicePixelRatio, 2) con ratio ${ratio}`, async ({ browser }, testInfo) => {
    test.skip(conTactil(testInfo), "Basta con un proyecto");
    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: ratio });
    const page = await contexto.newPage();
    await page.goto("/");
    const medidas = await page.locator("#lienzo").evaluate((lienzo: HTMLCanvasElement) => {
      const { width, height } = lienzo.getBoundingClientRect();
      return { css: { width, height }, real: { width: lienzo.width, height: lienzo.height } };
    });
    const factor = Math.min(ratio, 2);
    expect(medidas.real.width).toBe(Math.round(medidas.css.width * factor));
    expect(medidas.real.height).toBe(Math.round(medidas.css.height * factor));
    await contexto.close();
  });
}

test("al acabar, data-toques es una lista de enteros crecientes", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo), { conRetraso: 2, retrasoMs: 1600 });
  const { toques } = await datosFin(page);
  expect(toques.length).toBeGreaterThan(0);
  for (const [i, toque] of toques.entries()) {
    expect(Number.isInteger(toque)).toBe(true);
    if (i > 0) expect(toque).toBeGreaterThan(toques[i - 1]!);
  }
});

test("en 390×844 la tarjeta de fin va arriba y deja libre la parte baja para la cima", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  const { zona, fin, hud } = await page.evaluate(() => ({
    zona: document.getElementById("zona")!.getBoundingClientRect().toJSON() as DOMRect,
    fin: document.getElementById("fin")!.getBoundingClientRect().toJSON() as DOMRect,
    hud: document.getElementById("hud")!.getBoundingClientRect().toJSON() as DOMRect,
  }));
  // Desde A5 el HUD va sobre el escenario: la tarjeta queda justo debajo de él.
  expect(fin.top - hud.bottom).toBeLessThan(24);
  expect(fin.bottom - zona.top).toBeLessThan(zona.height * 0.6);
});
