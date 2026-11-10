// G1: en la compilación normal no hay botones ni peticiones de anuncios.
import { expect, test, type Page } from "@playwright/test";
import { abrirNiveles, abrirRetos, conTactil, esperarInicio, irAlInicio, juego, jugarHastaElFin, jugarLibre, pausar, preparar } from "./ayudas.ts";

const DE_ANUNCIO = /anuncio|×2 monedas|seguir con 1 vida|congelador gratis/i;

async function sinBotonesDeAnuncio(page: Page, pantalla: string): Promise<void> {
  const nombres = await page.getByRole("button").evaluateAll((botones) =>
    botones.filter((b) => (b as HTMLElement).offsetParent !== null).map((b) => `${b.textContent ?? ""} ${b.getAttribute("aria-label") ?? ""}`),
  );
  expect(nombres.length, pantalla).toBeGreaterThan(0);
  for (const nombre of nombres) expect(nombre, pantalla).not.toMatch(DE_ANUNCIO);
}

test("ningún botón de anuncio en el inicio, la pausa, el fin de la libre, el fin de un nivel ni en Retos (G1, R12)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await esperarInicio(page);
  await sinBotonesDeAnuncio(page, "inicio");
  await jugarLibre(page);
  await pausar(page);
  await sinBotonesDeAnuncio(page, "pausa");
  await page.getByRole("button", { name: "Seguir" }).click();
  await jugarHastaElFin(page, conTactil(testInfo));
  await sinBotonesDeAnuncio(page, "fin de la libre");
  await irAlInicio(page);
  await abrirNiveles(page);
  await page.getByRole("button", { name: "Jugar nivel 1", exact: true }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "nivel");
  await jugarHastaElFin(page, conTactil(testInfo));
  await sinBotonesDeAnuncio(page, "fin de nivel");
  await irAlInicio(page);
  await abrirRetos(page);
  await sinBotonesDeAnuncio(page, "Retos");
  expect(await page.locator("body").innerText()).not.toMatch(DE_ANUNCIO);
  expect(vigilancia.ajenas).toEqual([]);
  expect(vigilancia.errores).toEqual([]);
});
