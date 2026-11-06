// Bloque A: fuente local, efectos, sonido, háptica e interfaz.
import { expect, test } from "@playwright/test";
import { esperarLibre, preparar } from "./ayudas.ts";

test("la fuente local se carga sin peticiones a otros orígenes (A1)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const cargada = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Bricolage Grotesque Variable"');
  });
  expect(cargada).toBe(true);
  expect(vigilancia.ajenas).toEqual([]);
  expect(vigilancia.errores).toEqual([]);
});
