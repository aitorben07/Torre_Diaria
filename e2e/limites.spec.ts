// Casos límite que no cubre la partida normal: almacenamiento bloqueado,
// pestaña oculta a mitad de partida y enlaces de reto inválidos.
import { expect, test, type Page } from "@playwright/test";
import { conTactil, datosFin, empezarHoy, esperarLibre, juego, jugarHastaElFin, preparar } from "./ayudas.ts";

test("con localStorage bloqueado se juega entera y sin errores en consola", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Almacenamiento bloqueado", "SecurityError");
      },
    });
  });
  const { errores, ajenas } = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo), { conRetraso: 1, retrasoMs: 1600 });
  let fin = await datosFin(page);
  expect(fin.toques.length).toBeGreaterThan(0);
  await expect(page.locator("#tarjeta")).toContainText("Torre Diaria");

  // El reto de hoy también se juega entero.
  await page.waitForTimeout(800);
  await empezarHoy(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  fin = await datosFin(page);
  expect(fin.toques.length).toBeGreaterThan(0);

  // Sin almacenamiento no se guarda nada: al recargar se puede volver a jugar.
  await page.reload();
  await esperarLibre(page);
  await empezarHoy(page);
  expect(errores).toEqual([]);
  expect(ajenas).toEqual([]);
});

/** Simula ocultar o mostrar la pestaña, como al cambiar a otra. */
async function ocultarPestana(page: Page, oculta: boolean): Promise<void> {
  await page.evaluate((valor) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => valor });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (valor ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, oculta);
}

test("con la pestaña oculta la simulación se para y al volver sigue", async ({ page }) => {
  const { errores } = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-fase", "apuntando");
  await expect(juego(page)).toHaveAttribute("data-x", /\d/);

  await ocultarPestana(page, true);
  // Deja pasar un fotograma por si ya había pasos pendientes.
  await page.evaluate(() => new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo))));
  const xOculta = await juego(page).getAttribute("data-x");
  await page.waitForTimeout(800);
  expect(await juego(page).getAttribute("data-x")).toBe(xOculta);
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");

  await ocultarPestana(page, false);
  await expect(juego(page)).not.toHaveAttribute("data-x", xOculta!);
  // Al volver no recupera de golpe el tiempo oculto: sigue cerca de donde estaba.
  const xVuelta = Number(await juego(page).getAttribute("data-x"));
  expect(Math.abs(xVuelta - Number(xOculta))).toBeLessThan(1);
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  expect(errores).toEqual([]);
});

const RETOS_INVALIDOS = [
  "abc",
  "1",
  "1.5.5",
  "01.5",
  "1.1000",
  "99999.5",
  "<b>1.5</b>",
  '1.5"><script>alert(1)</script>',
  "1.5<img src=x onerror=alert(1)>",
  "%3Csvg%20onload%3Dalert(1)%3E",
];

test("un enlace de reto inválido o con HTML se ignora sin inyectar nada", async ({ page }) => {
  let dialogos = 0;
  page.on("dialog", async (dialogo) => {
    dialogos++;
    await dialogo.dismiss();
  });
  const { errores } = await preparar(page);
  await page.goto("/");
  const scripts = await page.locator("script").count();
  for (const reto of RETOS_INVALIDOS) {
    await page.goto(`/?reto=${encodeURIComponent(reto)}`);
    await expect(page.locator("#aviso-reto"), reto).toBeHidden();
    await expect(page.locator("#comparacion"), reto).toBeHidden();
    await expect(page.locator("#boton-reto"), reto).toBeHidden();
    await expect(juego(page), reto).toHaveAttribute("data-modo", "libre");
    await expect(page.locator("img, svg, b"), reto).toHaveCount(0);
    expect(await page.locator("script").count(), reto).toBe(scripts);
    expect(await page.locator("body").innerHTML(), reto).not.toContain("alert(1)");
  }
  // El juego sigue funcionando con el último enlace.
  await empezarHoy(page);
  expect(dialogos).toBe(0);
  expect(errores).toEqual([]);
});
