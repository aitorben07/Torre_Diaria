// B5: partida libre al abrir, «Otra vez» con la espera de 700 ms, aviso del
// primer toque, vidas en el HUD y sin la palabra «Práctica».
import { expect, test, type Page } from "@playwright/test";
import { conTactil, esperarFinListo, esperarLibre, juego, jugarHastaElFin, preparar, tocar } from "./ayudas.ts";

/**
 * Dentro de la página: en cuanto se muestra el fin (un `MutationObserver` lo ve
 * en el mismo instante), pulsa «Otra vez» (o Espacio) a los `ms` milisegundos.
 * Devuelve la pantalla que queda justo después y los ms que pasaron de verdad.
 */
function pulsarTrasElFin(page: Page, ms: number, conTecla: boolean): Promise<{ estado: string; pasados: number }> {
  return page.evaluate(
    ([espera, tecla]) =>
      new Promise<{ estado: string; pasados: number }>((listo) => {
        const el = document.getElementById("juego")!;
        const pulsar = () => {
          const desde = performance.now();
          setTimeout(() => {
            const pasados = performance.now() - desde;
            if (tecla) document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
            else document.getElementById("boton-otra-vez")!.click();
            listo({ estado: el.dataset.estado!, pasados });
          }, espera);
        };
        if (el.dataset.estado === "fin") return pulsar();
        const observador = new MutationObserver(() => {
          if (el.dataset.estado !== "fin") return;
          observador.disconnect();
          pulsar();
        });
        observador.observe(el, { attributes: true, attributeFilter: ["data-estado"] });
      }),
    [ms, conTecla] as const,
  );
}

test("al cargar / ya se juega la partida libre, sin ningún clic, y un toque suelta la pieza", async ({ page }, testInfo) => {
  const { errores } = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-fase", "apuntando");
  await expect(juego(page)).toHaveAttribute("data-semilla", /^libre-/);
  await expect(juego(page)).toHaveAttribute("data-vidas", "3");
  await tocar(page, conTactil(testInfo));
  await expect(juego(page)).not.toHaveAttribute("data-fase", "apuntando");
  expect(errores).toEqual([]);
});

test("tras el fin, un toque a los 300 ms no reinicia; a los 800 ms, «Otra vez» empieza otra semilla", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const primera = await juego(page).getAttribute("data-semilla");
  const fin = pulsarTrasElFin(page, 300, false);
  await jugarHastaElFin(page, conTactil(testInfo));
  const temprano = await fin;
  // Si el equipo va tan cargado que el temporizador llega pasados 700 ms, la prueba no vale.
  expect(temprano.pasados).toBeLessThan(700);
  expect(temprano.estado).toBe("fin");
  await page.waitForTimeout(200);
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");

  // Ya pasados 700 ms desde el fin: un solo toque basta.
  await page.getByRole("button", { name: "Otra vez" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(juego(page)).toHaveAttribute("data-modo", "libre");
  const segunda = await juego(page).getAttribute("data-semilla");
  expect(segunda).not.toBe(primera);

  // Con Espacio: a los 300 ms no hace nada; a los 800 ms, otra partida.
  const conTecla = pulsarTrasElFin(page, 300, true);
  await jugarHastaElFin(page, conTactil(testInfo));
  const conTeclaTemprano = await conTecla;
  expect(conTeclaTemprano.pasados).toBeLessThan(700);
  expect(conTeclaTemprano.estado).toBe("fin");
  expect((await pulsarTrasElFin(page, 800, true)).estado).toBe("jugando");
  expect(await juego(page).getAttribute("data-semilla")).not.toBe(segunda);
});

test("en escritorio, Espacio en el fin empieza otra partida", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo en escritorio");
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const primera = await juego(page).getAttribute("data-semilla");
  await jugarHastaElFin(page, false);
  await esperarFinListo(page);
  await page.keyboard.press("Space");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  expect(await juego(page).getAttribute("data-semilla")).not.toBe(primera);
});

test("el aviso «Toca para soltar» solo sale hasta el primer toque de la primera partida", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const aviso = page.getByText("Toca para soltar");
  await expect(aviso).toBeVisible();
  await tocar(page, conTactil(testInfo));
  await expect(aviso).toBeHidden();

  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);
  await page.getByRole("button", { name: "Otra vez" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(aviso).toBeHidden();

  await page.reload();
  await esperarLibre(page);
  await expect(aviso).toBeHidden();
});

test("el HUD muestra las vidas que quedan tras una caída", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await expect(page.locator("#vidas .vida:not(.perdida)")).toHaveCount(3);
  // La pieza aparece en el extremo, fuera de la plataforma: tocar en seguida la tira.
  await tocar(page, conTactil(testInfo));
  await expect(juego(page)).toHaveAttribute("data-vidas", "2");
  await expect(page.locator("#vidas .vida")).toHaveCount(3);
  await expect(page.locator("#vidas .vida.perdida")).toHaveCount(1);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");
});

test("ningún botón ni texto de la interfaz dice «Práctica»", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const textos = async () => (await page.locator("body").innerText()) + (await page.locator("button").allTextContents()).join(" ");
  expect(await textos()).not.toMatch(/pr[aá]ctica/i);
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(page.locator("#tarjeta")).toContainText("Partida libre");
  expect(await textos()).not.toMatch(/pr[aá]ctica/i);
  await page.goto("/?reto=1.5");
  expect(await textos()).not.toMatch(/pr[aá]ctica/i);
});
