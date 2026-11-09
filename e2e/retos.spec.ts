// Bloque D: pantalla Retos con calendario, rachas, congeladores, atrasados y
// el enlace de reto v2.
import { expect, test } from "@playwright/test";
import { abrirRetos, conTactil, DIA, empezarHoy, esperarInicio, juego, jugarHastaElFin, leerProgreso, preparar, sembrarProgreso } from "./ayudas.ts";

test("con la fecha en el día 40, el calendario muestra diciembre, deja ir a noviembre de 2026 y no más atrás, y los días futuros no se pulsan (D2)", async ({ page }) => {
  // Día 40: 14 de diciembre de 2026.
  const { errores } = await preparar(page, "2026-12-14T12:00:00Z");
  await page.goto("/");
  await abrirRetos(page);
  await expect(page.locator("#mes-nombre")).toHaveText("diciembre 2026");
  await expect(page.locator("#ficha-titulo")).toHaveText("Reto de hoy #40");
  await expect(page.locator("#dia-41")).toBeDisabled();
  await expect(page.locator("#dia-40")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
  await page.getByRole("button", { name: "Mes anterior" }).click();
  await expect(page.locator("#mes-nombre")).toHaveText("noviembre 2026");
  await expect(page.getByRole("button", { name: "Mes anterior" })).toBeDisabled();
  // Antes del día 1 (5 de noviembre) no hay retos.
  await expect(page.locator("#dia-1")).toBeEnabled();
  await expect(page.locator("#calendario button")).toHaveCount(26);
  await page.locator("#dia-3").click();
  await expect(page.locator("#ficha-titulo")).toHaveText("Reto #3 · 7 de noviembre");
  await expect(page.getByRole("button", { name: "Jugar el día #3" })).toBeVisible();
  expect(errores).toEqual([]);
});

test("jugar el reto de hoy desde el calendario y recargar: el día sale jugado en su día, la racha es 1 y no hay otro intento oficial (D2)", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await empezarHoy(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(page.locator("#fin-medalla-texto")).toContainText("racha de 1 día");
  await expect(page.locator("#fin-monedas")).toBeVisible();

  await page.reload();
  await esperarInicio(page);
  await expect(juego(page)).toHaveAttribute("data-racha", "1");
  await abrirRetos(page);
  await expect(page.locator(`#dia-${DIA}`)).toHaveAttribute("data-estado-dia", "enSuDia");
  await expect(page.locator(`#dia-${DIA} .medalla`)).toHaveCount(1);
  await expect(page.locator("#racha-actual")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Jugar el reto de hoy" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Jugar otra vez (no cuenta)" })).toBeVisible();

  // Jugarlo otra vez no cuenta: ni guarda ni da monedas.
  const antes = await leerProgreso(page);
  await page.getByRole("button", { name: "Jugar otra vez (no cuenta)" }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "repeticion");
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(page.locator("#fin-titulo")).toHaveText(`Reto del día #${DIA} (no cuenta)`);
  await expect(page.locator("#fin-monedas")).toBeHidden();
  // Sus puntos no son los oficiales: la tarjeta enlaza la página principal, sin ?reto=.
  await expect(page.locator("#tarjeta")).not.toContainText("reto=");
  const despues = await leerProgreso(page);
  expect(despues!.diarios).toEqual(antes!.diarios);
  expect(despues!.monedas).toBe(antes!.monedas);
});

test("jugar un día pasado lo marca como atrasado y no cambia la racha (D2)", async ({ page }, testInfo) => {
  await sembrarProgreso(page, {
    diarios: { [DIA - 1]: { puntos: 600, piezas: 20, altura: 8, perfectos: 4, colocadas: "0-19", enSuDia: true, reglas: 2 } },
    racha: { actual: 1, mejor: 1, ultimoDia: DIA - 1, congeladores: 0 },
  });
  await preparar(page);
  await page.goto("/");
  await abrirRetos(page);
  await page.locator("#dia-5").click();
  await page.getByRole("button", { name: "Jugar el día #5" }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "oficial");
  await expect(juego(page)).toHaveAttribute("data-semilla", "2026-11-09");
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(page.locator("#fin-medalla-texto")).toContainText("atrasado");
  const progreso = await leerProgreso(page);
  expect(progreso!.diarios[5]).toMatchObject({ enSuDia: false });
  expect(progreso!.racha).toMatchObject({ actual: 1, ultimoDia: DIA - 1 });
  await page.reload();
  await abrirRetos(page);
  await expect(page.locator("#dia-5")).toHaveAttribute("data-estado-dia", "atrasado");
  await expect(page.locator("#racha-actual")).toHaveText("1");
});

test("un día jugado con las reglas 2 conserva su medalla y sus puntos en Retos y no se juega otra vez como oficial (R16)", async ({ page }) => {
  // 2.400 puntos: plata con los umbrales de la v2.
  const v2 = { puntos: 2400, piezas: 49, altura: 23.5, perfectos: 42, colocadas: "0-48", enSuDia: true, reglas: 2 };
  await sembrarProgreso(page, { diarios: { 5: v2 } });
  await preparar(page);
  await page.goto("/");
  await abrirRetos(page);
  await expect(page.locator("#dia-5")).toHaveAttribute("aria-label", /: plata$/);
  await page.locator("#dia-5").click();
  await expect(page.locator("#ficha-texto")).toHaveText("Plata · 2.400 puntos · 23,5 m");
  await expect(page.locator("#ficha-medalla")).toHaveClass(/plata/);
  await expect(page.getByRole("button", { name: "Jugar el día #5" })).toBeHidden();
  // Solo se puede repetir, sin que cuente.
  await expect(page.locator("#ficha-repetir")).toBeVisible();
  expect((await leerProgreso(page))!.diarios[5]).toEqual(v2);
});

test("comprar un congelador con 250 monedas deja 50 y 1 congelador; con 2 el botón está desactivado (D2)", async ({ page }) => {
  await sembrarProgreso(page, { monedas: 250 });
  await preparar(page);
  await page.goto("/");
  await abrirRetos(page);
  const comprar = page.getByRole("button", { name: "Comprar congelador de racha por 200 monedas" });
  await comprar.click();
  await expect(juego(page)).toHaveAttribute("data-monedas", "50");
  await expect(page.locator("#congeladores")).toHaveAttribute("aria-label", "1 congelador de racha");
  expect((await leerProgreso(page))!).toMatchObject({ monedas: 50, racha: { congeladores: 1 } });
  // Sin monedas suficientes, desactivado.
  await expect(comprar).toBeDisabled();

  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("torre-diaria:progreso")!);
    p.monedas = 5000;
    p.racha.congeladores = 2;
    localStorage.setItem("torre-diaria:progreso", JSON.stringify(p));
  });
  await page.reload();
  await abrirRetos(page);
  await expect(page.locator("#congeladores")).toHaveAttribute("aria-label", "2 congeladores de racha");
  await expect(comprar).toBeDisabled();
});

test("la cabecera de Retos muestra el siguiente desbloqueo por racha (impacto, D2)", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await abrirRetos(page);
  await expect(page.locator("#racha-siguiente")).toHaveText("Racha de 3: Ciudad");
});

test("abrir /?reto=<hoy>.500 sin haber jugado y acabar la partida la guarda como oficial de hoy y suma racha (D3)", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto(`/?reto=${DIA}.500`);
  await expect(page.locator("#aviso-reto")).toContainText("500 puntos");
  await page.getByRole("button", { name: `Jugar el reto de hoy #${DIA}` }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "oficial");
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(page.locator("#fin-reto")).toBeVisible();
  const progreso = await leerProgreso(page);
  expect(progreso!.diarios[DIA]).toMatchObject({ enSuDia: true, reglas: 3 });
  expect(progreso!.racha).toMatchObject({ actual: 1, ultimoDia: DIA });
});

test("un enlace de reto con puntos de la v2 (123.456) se lee entero (D3)", async ({ page }) => {
  await preparar(page);
  await page.goto("/?reto=12.123456");
  await expect(page.locator("#aviso-reto")).toContainText("123.456 puntos");
  await expect(page.locator("#aviso-reto")).toContainText("#12");
});

test("si falta un día y hay congelador, al abrir se gasta y la racha sigue (D1)", async ({ page }) => {
  await sembrarProgreso(page, { racha: { actual: 4, mejor: 4, ultimoDia: DIA - 2, congeladores: 1 } });
  await preparar(page);
  await page.goto("/");
  await esperarInicio(page);
  await expect(juego(page)).toHaveAttribute("data-racha", "4");
  expect((await leerProgreso(page))!.racha).toMatchObject({ actual: 4, congeladores: 0, ultimoDia: DIA - 1 });
});
