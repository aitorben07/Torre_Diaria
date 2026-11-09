// Casos límite que no cubre la partida normal: almacenamiento bloqueado,
// pestaña oculta a mitad de partida y enlaces de reto inválidos.
import { expect, test, type Page } from "@playwright/test";
import { conTactil, datosFin, empezarHoy, irAlInicio, juego, jugarHastaElFin, jugarLibre, preparar } from "./ayudas.ts";

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
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo), { conRetraso: 1, retrasoMs: 1600 });
  let fin = await datosFin(page);
  expect(fin.toques.length).toBeGreaterThan(0);
  await expect(page.locator("#tarjeta")).toContainText("Torre Diaria");

  // El reto de hoy también se juega entero (desde el inicio, E2).
  await irAlInicio(page);
  await empezarHoy(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  fin = await datosFin(page);
  expect(fin.toques.length).toBeGreaterThan(0);

  // Sin almacenamiento no se guarda nada: al recargar se puede volver a jugar.
  await page.reload();
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

test("con la pestaña oculta la partida queda en pausa y al volver sigue en pausa hasta «Seguir» (E3)", async ({ page }) => {
  const { errores } = await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-fase", "apuntando");
  await expect(juego(page)).toHaveAttribute("data-x", /\d/);

  await ocultarPestana(page, true);
  await expect(juego(page)).toHaveAttribute("data-estado", "pausa");
  // Deja pasar un fotograma por si ya había pasos pendientes.
  await page.evaluate(() => new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo))));
  const xOculta = await juego(page).getAttribute("data-x");
  const pasosOculta = await juego(page).getAttribute("data-pasos");
  await page.waitForTimeout(800);
  expect(await juego(page).getAttribute("data-x")).toBe(xOculta);

  // Al volver, sigue en pausa con su panel: la pieza no se mueve sola (T29).
  await ocultarPestana(page, false);
  await expect(juego(page)).toHaveAttribute("data-estado", "pausa");
  await expect(page.locator("#pausa")).toBeVisible();
  await page.waitForTimeout(800);
  expect(await juego(page).getAttribute("data-x")).toBe(xOculta);
  expect(await juego(page).getAttribute("data-pasos")).toBe(pasosOculta);

  // «Seguir»: no recupera de golpe el tiempo en pausa, sigue cerca de donde
  // estaba. Se lee la x en el primer fotograma en que cambia, dentro de la
  // página: leerla después desde Playwright, con el equipo cargado, llegaba tarde.
  const xVuelta = await page.evaluate(
    (antes) =>
      new Promise<number>((listo) => {
        const mirar = () => {
          const x = document.getElementById("juego")!.dataset.x;
          if (x && x !== antes) return listo(Number(x));
          requestAnimationFrame(mirar);
        };
        document.getElementById("boton-seguir")!.click();
        mirar();
      }),
    xOculta,
  );
  expect(Math.abs(xVuelta - Number(xOculta))).toBeLessThan(1);
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  expect(errores).toEqual([]);
});

const RETOS_INVALIDOS = [
  "abc",
  "1",
  "1.5.5",
  "01.5",
  "1.1000000",
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
    // Los únicos SVG de la página son los iconos dibujados de la interfaz, todos con aria-hidden (A4, G11).
    await expect(page.locator('img, svg:not([aria-hidden="true"]), b'), reto).toHaveCount(0);
    expect(await page.locator("script").count(), reto).toBe(scripts);
    expect(await page.locator("body").innerHTML(), reto).not.toContain("alert(1)");
  }
  // El juego sigue funcionando con el último enlace.
  await empezarHoy(page);
  expect(dialogos).toBe(0);
  expect(errores).toEqual([]);
});

const LIBRES_INVALIDOS = ["ABC.1", "a1b2c3d4.1", "a.1000000", "a.", "<script>", "a.5<img src=x onerror=alert(1)>", 'a.5"><script>alert(1)</script>'];

test("un enlace de partida libre inválido o con HTML se ignora sin inyectar nada (G5, F2)", async ({ page }) => {
  let dialogos = 0;
  page.on("dialog", async (dialogo) => {
    dialogos++;
    await dialogo.dismiss();
  });
  const { errores } = await preparar(page);
  await page.goto("/");
  const scripts = await page.locator("script").count();
  for (const libre of LIBRES_INVALIDOS) {
    await page.goto(`/?libre=${encodeURIComponent(libre)}`);
    await expect(page.locator("#aviso-reto"), libre).toBeHidden();
    // Sin enlace válido, la pantalla de inicio (E2).
    await expect(juego(page), libre).toHaveAttribute("data-estado", "inicio");
    await expect(juego(page), libre).toHaveAttribute("data-modo", "libre");
    await expect(page.locator('img, svg:not([aria-hidden="true"]), b'), libre).toHaveCount(0);
    expect(await page.locator("script").count(), libre).toBe(scripts);
    expect(await page.locator("body").innerHTML(), libre).not.toContain("alert(1)");
  }
  expect(dialogos).toBe(0);
  expect(errores).toEqual([]);
});
