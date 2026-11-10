// J1 de la tercera versión: la Colección pasa a ser la Tienda, con las
// pestañas Objetos (al abrir), Piezas y Escenarios; sin «Monedas» en la web
// (R12). Solo DOM: basta con escritorio (R17). El saldo de 999.999 en 320 px
// lo comprueba ya `marcador.spec.ts` con la cabecera de la Tienda.
import { expect, test } from "@playwright/test";
import { abrirTienda, conTactil, leerProgreso, preparar, sembrarProgreso } from "./ayudas.ts";

const conObjetos = (monedas: number, reloj: number) => ({
  version: 3,
  monedas,
  estadisticas: { piezas: 0, perfectos: 0, comboMax: 0, alturaMax: 0, partidas: 2 },
  objetos: { reloj, cemento: 0, corazon: 0, desbloqueados: ["reloj"] },
});

test.beforeEach(({}, testInfo) => {
  test.skip(conTactil(testInfo), "Solo DOM: basta con escritorio (R17)");
});

test("comprar un reloj con 500 monedas deja 500 − 120 y «Tienes 1»; los objetos aún bloqueados no se compran (J1)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, conObjetos(500, 0));
  await page.goto("/");
  await abrirTienda(page);
  await expect(page.getByRole("tab", { name: "Objetos" })).toHaveAttribute("aria-selected", "true");
  const reloj = page.locator('[data-articulo="reloj"]');
  await expect(reloj.locator(".estado")).toHaveText("Tienes 0");
  await page.getByRole("button", { name: "Comprar Reloj de arena por 120 monedas" }).click();
  await expect(page.locator("#tienda-monedas")).toHaveText("380");
  await expect(reloj.locator(".estado")).toHaveText("Tienes 1");
  await expect(reloj).toHaveAttribute("data-tienes", "1");
  const p = await leerProgreso(page);
  expect(p?.monedas).toBe(380);
  expect(p?.objetos.reloj).toBe(1);
  // El cemento (4 partidas) y el corazón (6) aún no: dicen cuándo llegan.
  await expect(page.locator('[data-articulo="cemento"] .estado')).toHaveText("Tras 4 partidas");
  await expect(page.locator("#objeto-comprar-cemento")).toBeDisabled();
  await expect(page.locator("#objeto-comprar-corazon")).toBeDisabled();
  // El congelador de racha también está aquí.
  await expect(page.locator('[data-articulo="congelador"] .estado')).toHaveText("Tienes 0");
  expect(vigilancia.errores).toEqual([]);
});

test("con 9 relojes, su botón está desactivado (J1)", async ({ page }) => {
  await preparar(page);
  await sembrarProgreso(page, conObjetos(5000, 9));
  await page.goto("/");
  await abrirTienda(page);
  await expect(page.locator('[data-articulo="reloj"] .estado')).toHaveText("Tienes 9, el máximo");
  await expect(page.locator("#objeto-comprar-reloj")).toBeDisabled();
});

test("las pestañas funcionan con flechas, Inicio, Fin y Tab, con role=tab y aria-selected (J1)", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await abrirTienda(page);
  const pestana = (nombre: string) => page.getByRole("tab", { name: nombre });
  await pestana("Objetos").focus();
  await page.keyboard.press("ArrowRight");
  await expect(pestana("Piezas")).toBeFocused();
  await expect(pestana("Piezas")).toHaveAttribute("aria-selected", "true");
  await expect(pestana("Objetos")).toHaveAttribute("aria-selected", "false");
  await expect(page.locator("#articulos")).toHaveAttribute("data-pestana", "tema");
  await page.keyboard.press("End");
  await expect(pestana("Escenarios")).toBeFocused();
  await expect(page.locator("#articulos")).toHaveAttribute("data-pestana", "escenario");
  await page.keyboard.press("ArrowRight");
  await expect(pestana("Objetos")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(pestana("Escenarios")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(pestana("Objetos")).toHaveAttribute("aria-selected", "true");
  // Con Tab se llega a cada pestaña y Espacio la elige.
  await page.keyboard.press("Tab");
  await expect(pestana("Piezas")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(pestana("Piezas")).toHaveAttribute("aria-selected", "true");
  // Al volver a abrir, otra vez en Objetos.
  await page.keyboard.press("Escape");
  await abrirTienda(page);
  await expect(pestana("Objetos")).toHaveAttribute("aria-selected", "true");
});

test("en la compilación web no hay pestaña «Monedas» (R12)", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await abrirTienda(page);
  await expect(page.getByRole("tab")).toHaveCount(3);
  await expect(page.getByRole("tab", { name: "Monedas" })).toHaveCount(0);
  expect(await page.locator("#tienda").innerText()).not.toMatch(/€|v[ií]deo/i);
});
