// F2 y F3: enlace de partida libre, tarjeta sin emojis, imagen PNG y compartir con archivo.
import { expect, test } from "@playwright/test";
import { conTactil, datosFin, esperarLibre, juego, jugarHastaElFin, preparar } from "./ayudas.ts";

test("abrir /?libre=<código>.300 avisa con 300 y hace jugar esa semilla, que cuenta como libre (F2)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/?libre=a1b2c3.300");
  await expect(juego(page)).toHaveAttribute("data-estado", "reto");
  await expect(page.locator("#aviso-reto")).toHaveText("Tu amigo hizo 300 puntos en esta partida. ¿Le superas?");
  await page.getByRole("button", { name: "Jugar esta partida" }).click();
  await esperarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-semilla", "libre-a1b2c3");
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 2 });
  const fin = await datosFin(page);
  expect(fin.semilla).toBe("libre-a1b2c3");
  await expect(page.locator("#fin-reto")).toContainText("300 puntos");
  await expect(page.locator("#tarjeta")).toContainText(`/?libre=a1b2c3.${fin.puntos}`);
  // Cuenta para monedas y récord como cualquier libre.
  await expect(juego(page)).not.toHaveAttribute("data-ganadas", "0");
  expect(vigilancia.errores).toEqual([]);
});

test("la tarjeta de texto no lleva emojis en el fin libre ni en el del reto (F2)", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  const texto = (await page.locator("#tarjeta").textContent()) ?? "";
  expect(texto).toMatch(/^Torre Diaria: .+ en partida libre\.\n¿Me superas\? http.+\/\?libre=[0-9a-z]{1,7}\.\d+$/);
  expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
});
