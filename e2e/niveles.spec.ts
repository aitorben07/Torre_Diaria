// E3: mapa de niveles, ganar el nivel 1 y equivalencia de un nivel con `jugar()` en Node (G3).
import { expect, test, type Page } from "@playwright/test";
import { jugar } from "../src/logica/simulacion.ts";
import { conTactil, datosFin, esperarFinListo, esperarLibre, juego, jugarHastaElFin, leerProgreso, preparar, sembrarProgreso } from "./ayudas.ts";

async function abrirNiveles(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Niveles/ }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "niveles");
}

test("con progreso nuevo solo el nivel 1 se puede pulsar (E3)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await abrirNiveles(page);
  await expect(page.locator("#nivel-1")).toBeEnabled();
  for (let n = 2; n <= 10; n++) await expect(page.locator(`#nivel-${n}`)).toBeDisabled();
  await expect(page.locator("#ficha-nivel-titulo")).toHaveText("Nivel 1");
  await expect(page.locator("#ficha-nivel-objetivo")).toHaveText("Coloca 5 piezas");
  // Al cerrar, la partida libre en pausa sigue.
  await page.getByRole("button", { name: "Cerrar" }).first().click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  expect(vigilancia.errores).toEqual([]);
});

test("ganar el nivel 1 muestra estrellas, desbloquea el 2 y se mantiene tras recargar (E3)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await abrirNiveles(page);
  await page.getByRole("button", { name: "Jugar el nivel 1" }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "nivel");
  await expect(juego(page)).toHaveAttribute("data-nivel", "1");
  await expect(page.locator("#hud-meta")).toHaveText("Meta: 5 piezas");
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 10 });
  await expect(juego(page)).toHaveAttribute("data-victoria", "true");
  const estrellas = Number(await juego(page).getAttribute("data-estrellas"));
  expect(estrellas).toBeGreaterThanOrEqual(1);
  await expect(page.locator("#fin-estrellas")).toHaveAttribute("data-estrellas", String(estrellas));
  await expect(page.locator("#fin-estrellas svg.estrella.llena")).toHaveCount(estrellas);
  await expect(page.locator("#fin-titulo")).toHaveText("Nivel 1");
  await expect(page.locator("#fin-monedas")).toBeVisible();
  await expect(page.locator("#boton-otra-vez")).toHaveText("Siguiente nivel");
  expect((await leerProgreso(page))?.niveles).toEqual({ 1: estrellas });

  await page.reload();
  await esperarLibre(page);
  await abrirNiveles(page);
  await expect(page.locator("#nivel-2")).toBeEnabled();
  await expect(page.locator("#nivel-3")).toBeDisabled();
  await expect(page.locator("#nivel-1")).toHaveAttribute("data-estrellas", String(estrellas));
  // El último disponible es el elegido al abrir.
  await expect(page.locator("#ficha-nivel-titulo")).toHaveText("Nivel 2");
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("«Siguiente nivel» juega el 2 y «Mapa» abre el mapa (E3)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await sembrarProgreso(page, { niveles: {} });
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await abrirNiveles(page);
  await page.getByRole("button", { name: "Jugar el nivel 1" }).click();
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 10 });
  await esperarFinListo(page);
  await page.locator("#boton-mapa").click();
  await expect(juego(page)).toHaveAttribute("data-estado", "niveles");
  await page.getByRole("button", { name: "Cerrar" }).first().click();
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  await page.locator("#boton-otra-vez").click();
  await expect(juego(page)).toHaveAttribute("data-nivel", "2");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
});

test("al abrir el mapa con el nivel 8 disponible, su ficha queda visible sin desplazarse (E3)", async ({ page }) => {
  await sembrarProgreso(page, { niveles: { 1: 3, 2: 3, 3: 2, 4: 1, 5: 3, 6: 2, 7: 1 } });
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await abrirNiveles(page);
  await expect(page.locator("#ficha-nivel-titulo")).toHaveText("Nivel 8");
  await expect(page.locator("#nivel-8")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#nivel-8")).toBeEnabled();
  await expect(page.locator("#nivel-9")).toBeDisabled();
  await expect(page.locator("#niveles-estrellas")).toHaveText("15");
  await expect(page.getByRole("button", { name: /^Niveles/ })).toHaveAttribute("aria-label", "Niveles: 15 estrellas");
});

test("perder un nivel ofrece Repetir y Mapa; el nivel en pantalla equivale a jugar() en Node (E3, G3)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, { niveles: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } });
  await page.goto("/");
  await esperarLibre(page);
  await abrirNiveles(page);
  // El 7: una sola vida; dos piezas centradas y la tercera en el extremo, que cae.
  await page.getByRole("button", { name: "Jugar el nivel 7" }).click();
  await expect(juego(page)).toHaveAttribute("data-nivel", "7");
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 2 });
  await expect(juego(page)).toHaveAttribute("data-victoria", "false");
  await expect(page.locator("#boton-otra-vez")).toHaveText("Repetir");
  await expect(page.locator("#boton-mapa")).toBeVisible();
  await expect(page.locator("#boton-repetir-nivel")).toBeHidden();
  await expect(page.locator("#fin-objetivo")).toHaveText("Sin superar: Coloca 12 piezas con 1 vida");

  const fin = await datosFin(page);
  expect(fin.semilla).toBe("nivel-7");
  const enNode = jugar(fin.semilla, fin.toques, { ...fin.opciones, ayudas: fin.ayudas });
  expect(enNode.terminada).toBe(true);
  expect(enNode.victoria).toBe(false);
  expect(enNode.puntos).toBe(fin.puntos);
  expect(enNode.altura).toBeCloseTo(fin.altura, 9);
  // Perder no guarda estrellas.
  expect((await leerProgreso(page))?.niveles[7]).toBeUndefined();
  expect(vigilancia.errores).toEqual([]);
});
