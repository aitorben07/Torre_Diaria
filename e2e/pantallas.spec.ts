// T9 y T6 (adaptadas a B5, C1 y D): reto de hoy, pantalla de fin, copiar,
// compartir y reto de un amigo.
import { expect, test, type Page } from "@playwright/test";
import { abrirRetos, CLAVE_PROGRESO, conTactil, DIA, empezarHoy, esperarFinListo, esperarLibre, juego, jugarHastaElFin, leerProgreso, preparar } from "./ayudas.ts";

async function jugarOficialRapida(page: Page, tactil: boolean): Promise<void> {
  await empezarHoy(page);
  await jugarHastaElFin(page, tactil);
}

/** El día `dia` guardado en el progreso, como texto, para compararlo tal cual. */
const leerDia = async (page: Page, dia = DIA) => JSON.stringify((await leerProgreso(page))?.diarios?.[dia] ?? null);

test("tras la partida oficial, recargar y abrir Retos muestra el mismo resultado en la ficha de hoy", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await jugarOficialRapida(page, conTactil(testInfo));
  const puntos = Number(await juego(page).getAttribute("data-puntos"));
  const tarjeta = await page.locator("#tarjeta").textContent();

  await page.reload();
  await esperarLibre(page);
  await abrirRetos(page);
  await expect(page.locator("#ficha-titulo")).toHaveText(`Reto de hoy #${DIA}`);
  await expect(page.locator("#ficha-texto")).toContainText(`${puntos} punto`);
  await expect(page.getByRole("button", { name: "Jugar el reto de hoy" })).toBeHidden();
  // Por el enlace de un amigo de hoy se llega a la misma pantalla de fin.
  await page.goto(`/?reto=${DIA}.5`);
  await page.getByRole("button", { name: "Ver mi resultado de hoy" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  await expect(juego(page)).toHaveAttribute("data-modo", "oficial");
  await expect(page.locator("#fin-titulo")).toHaveText(`Reto del día #${DIA}`);
  await expect(page.locator("#tarjeta")).toHaveText(tarjeta!);
});

test("una partida libre tras la oficial no cambia el resultado guardado", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await jugarOficialRapida(page, conTactil(testInfo));
  const antes = await leerDia(page);
  expect(antes).not.toBe("null");

  await esperarFinListo(page);
  await page.getByRole("button", { name: "Partida libre" }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "libre");
  await jugarHastaElFin(page, conTactil(testInfo), { conRetraso: 1, retrasoMs: 1600 });
  await expect(page.locator("#tarjeta")).toContainText("Partida libre");
  await expect(page.locator("#tarjeta")).not.toContainText("reto=");
  expect(await leerDia(page)).toBe(antes);
});

test("Compartir llama una vez a navigator.share solo con text", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const llamadas: unknown[] = [];
    (window as unknown as { __compartido: unknown[] }).__compartido = llamadas;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (datos: unknown) => void llamadas.push(datos),
    });
  });
  const { errores } = await preparar(page);
  await page.goto("/");
  await jugarOficialRapida(page, conTactil(testInfo));
  await page.getByRole("button", { name: "Compartir" }).click();
  const llamadas = await page.evaluate(() => (window as unknown as { __compartido: Array<Record<string, unknown>> }).__compartido);
  expect(llamadas).toHaveLength(1);
  expect(String(llamadas[0]!.text)).toContain(`Torre Diaria #${DIA}`);
  expect(Object.keys(llamadas[0]!)).toEqual(["text"]);
  expect(errores).toEqual([]);
});

test("sin navigator.share el botón Compartir no se ve", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    delete (Navigator.prototype as { share?: unknown }).share;
    delete (navigator as { share?: unknown }).share;
  });
  await preparar(page);
  await page.goto("/");
  await jugarOficialRapida(page, conTactil(testInfo));
  await expect(page.getByRole("button", { name: "Copiar" })).toBeVisible();
  await expect(page.locator("#boton-compartir")).toBeHidden();
});

test("cancelar el menú de compartir (AbortError) no muestra error", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelado", "AbortError");
      },
    });
  });
  const { errores } = await preparar(page);
  await page.goto("/");
  await jugarOficialRapida(page, conTactil(testInfo));
  await page.getByRole("button", { name: "Compartir" }).click();
  await page.waitForTimeout(300);
  await expect(page.locator("#mensaje")).toHaveText("");
  expect(errores).toEqual([]);
});

test("Copiar deja en el portapapeles el texto exacto de la vista previa", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await preparar(page);
  await page.goto("/");
  await jugarOficialRapida(page, conTactil(testInfo));
  await page.getByRole("button", { name: "Copiar" }).click();
  await expect(page.locator("#mensaje")).toHaveText("Copiado");
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  // El portapapeles de Windows guarda los saltos de línea como \r\n.
  expect(copiado.replaceAll("\r\n", "\n")).toBe(await page.locator("#tarjeta").textContent());
});

test("/?reto=1.5 muestra el aviso con 5 puntos y el día #1, sin empezar la partida libre; jugarlo es su oficial atrasado", async ({ page }) => {
  await preparar(page);
  await page.goto("/?reto=1.5");
  const aviso = page.locator("#aviso-reto");
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("5");
  await expect(aviso).toContainText("#1");
  await expect(juego(page)).toHaveAttribute("data-estado", "reto");
  await expect(juego(page)).not.toHaveAttribute("data-semilla", /./);
  await expect(page.getByRole("button", { name: "Jugar el reto del día #1" })).toBeVisible();
  await page.getByRole("button", { name: "Jugar el reto del día #1" }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "oficial");
  await expect(juego(page)).toHaveAttribute("data-semilla", "2026-11-05");
});

test("un reto con HTML se trata como enlace inválido y no se interpreta", async ({ page }) => {
  let dialogos = 0;
  page.on("dialog", async (dialogo) => {
    dialogos++;
    await dialogo.dismiss();
  });
  const { errores } = await preparar(page);
  await page.goto("/?reto=1.5<img src=x onerror=alert(1)>");
  await page.waitForTimeout(500);
  expect(dialogos).toBe(0);
  await expect(page.locator("#aviso-reto")).toBeHidden();
  await esperarLibre(page);
  await expect(page.locator("img")).toHaveCount(0);
  expect(errores).toEqual([]);
});

test("tras jugar la oficial, el reto de hoy muestra los dos resultados sin otra partida oficial", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await jugarOficialRapida(page, conTactil(testInfo));
  const mios = Number((await juego(page).getAttribute("data-puntos")) ?? "NaN");

  await page.goto(`/?reto=${DIA}.5`);
  await expect(page.locator("#comparacion")).toHaveText(`Tú: ${mios} · Tu amigo: 5`);
  await expect(page.getByRole("button", { name: /Jugar el reto/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ver mi resultado de hoy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jugar otra vez (no cuenta)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Partida libre" })).toBeVisible();
  await page.getByRole("button", { name: "Ver mi resultado de hoy" }).click();
  await expect(page.locator("#fin-reto")).toBeVisible();
  await expect(page.locator("#fin-puntos")).toHaveText(`${mios} punto${mios === 1 ? "" : "s"}`);
});

test("pasada la medianoche UTC, el reto de hoy juega y guarda el día nuevo", async ({ page }, testInfo) => {
  await preparar(page, "2026-11-20T23:59:50Z");
  await page.goto("/");
  await esperarLibre(page);

  await page.clock.setFixedTime(new Date("2026-11-21T00:00:10Z"));
  await empezarHoy(page);
  await expect(juego(page)).toHaveAttribute("data-semilla", "2026-11-21");
  await jugarHastaElFin(page, conTactil(testInfo));
  const progreso = await leerProgreso(page);
  expect(Object.keys(progreso!.diarios)).toEqual([String(DIA + 1)]);
});

test("al volver a la pestaña pasada la medianoche UTC, el aviso del reto pasa a ser de otro día", async ({ page }) => {
  await preparar(page, "2026-11-20T23:59:50Z");
  await page.goto(`/?reto=${DIA}.5`);
  await expect(page.getByRole("button", { name: `Jugar el reto de hoy #${DIA}` })).toBeVisible();

  await page.clock.setFixedTime(new Date("2026-11-21T00:00:10Z"));
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("button", { name: `Jugar el reto del día #${DIA}` })).toBeVisible();
});

test("con dos pestañas, la oficial que acaba después no pisa la guardada", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await empezarHoy(page);
  // Mientras se juega, otra pestaña acaba la oficial de hoy y la guarda.
  const otra = { puntos: 99, piezas: 9, altura: 1.5, perfectos: 0, colocadas: "0-8", enSuDia: true, reglas: 2 };
  await page.evaluate(
    ([clave, valor]) => {
      const progreso = JSON.parse(localStorage.getItem(clave) ?? '{"version":2}');
      progreso.diarios = { [valor.dia]: valor.dato };
      localStorage.setItem(clave, JSON.stringify(progreso));
    },
    [CLAVE_PROGRESO, { dia: DIA, dato: otra }] as const,
  );
  await jugarHastaElFin(page, conTactil(testInfo));
  expect(await leerDia(page)).toBe(JSON.stringify(otra));
  await expect(page.locator("#fin-medalla-texto")).toHaveText("Este día ya estaba jugado: no cuenta");
});
