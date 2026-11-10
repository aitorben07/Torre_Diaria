// K3: la compilación de demostración (`npm run build:demo`, servidor del
// proyecto `demo`), con pagos y vídeos simulados. Aquí se ven la pestaña
// Monedas, el «≈ X,XX €», «Gratis con vídeo» y «Ver vídeo» en «¿Seguir?»; en
// la web, nada de eso (R12: `tienda.spec.ts`, `anuncios.spec.ts` y
// `objetos.spec.ts`). Sin ficha «Monedas gratis» en el inicio (recorte R-10).
// Solo escritorio y como mucho 6 pruebas (impacto, K3). El vídeo de prueba
// dura 3 s de verdad: con `page.clock.setFixedTime` los temporizadores siguen
// en marcha y solo la hora queda fijada, así que se mueve a mano.
import { expect, test, type Page } from "@playwright/test";
import { abrirTienda, CLAVE_PROGRESO, FECHA, juego, jugarLibre, leerProgreso, preparar, pulsarEnSeguir, sembrarProgreso, soltarEnExtremo } from "./ayudas.ts";

const conObjetos = (monedas: number) => ({
  version: 3,
  monedas,
  estadisticas: { piezas: 0, perfectos: 0, comboMax: 0, alturaMax: 0, partidas: 6 },
  objetos: { reloj: 1, cemento: 0, corazon: 0, desbloqueados: ["reloj", "cemento", "corazon"] },
});

const pestana = (page: Page, nombre: string) => page.getByRole("tab", { name: nombre, exact: true });
const saldo = (page: Page) => page.locator("#tienda-monedas");

/** Espera el vídeo de prueba y a que se cierre solo, con su premio. */
async function verVideoEntero(page: Page): Promise<void> {
  await expect(page.getByRole("dialog", { name: "Vídeo de prueba" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Vídeo de prueba" })).toBeHidden({ timeout: 10_000 });
}

test("la banda avisa de la demostración; la Tienda tiene Monedas, «≈ X,XX €» y «Gratis con vídeo», y el inicio no tiene «Monedas gratis»", async ({ page }) => {
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, conObjetos(500));
  await page.goto("/");
  await expect(page.locator("#banda-demo")).toHaveText("Demostración: no se cobra nada y los vídeos son de prueba");
  // Sus estilos (`demo.css`) se cargan aparte, solo en la demostración: la banda queda fija abajo y no recibe toques.
  await expect(page.locator("#banda-demo")).toHaveCSS("position", "fixed");
  await expect(page.locator("#banda-demo")).toHaveCSS("pointer-events", "none");
  await expect(page.locator("#inicio")).not.toContainText(/monedas gratis/i);
  await abrirTienda(page);
  await expect(page.getByRole("tab")).toHaveCount(4);
  // Monedas nunca es la pestaña de entrada (impacto, J1).
  await expect(pestana(page, "Objetos")).toHaveAttribute("aria-selected", "true");
  // 120 monedas a 1,99 € las 1.000.
  await expect(page.locator('[data-articulo="reloj"] .equivalente')).toHaveText("≈ 0,24 €");
  await expect(page.locator("#objeto-video-cemento")).toBeVisible();
  await pestana(page, "Monedas").click();
  await expect(page.locator("#producto-monedas-1000")).toHaveText("1,99 €");
  await expect(page.locator("#producto-pack-ayudas")).toBeEnabled();
  await expect(page.locator("#video-monedas")).toBeEnabled();
  // Las flechas también llegan a Monedas y vuelven a Objetos.
  await pestana(page, "Monedas").press("ArrowRight");
  await expect(pestana(page, "Objetos")).toHaveAttribute("aria-selected", "true");
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("comprar monedas-1000 con el pago simulado suma 1.000 una vez, y recargar no lo vuelve a sumar; cancelar no suma nada (K3)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, conObjetos(500));
  await page.goto("/");
  await abrirTienda(page);
  await pestana(page, "Monedas").click();
  await page.locator("#producto-monedas-1000").click();
  const pago = page.getByRole("dialog", { name: "Pago simulado" });
  await expect(pago).toContainText("No se cobra nada");
  await pago.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.locator("#tienda-mensaje")).toHaveText("No se ha cobrado nada");
  await expect(saldo(page)).toHaveText("500");
  await page.locator("#producto-monedas-1000").click();
  await pago.getByRole("button", { name: "Pagar" }).click();
  await expect(saldo(page)).toHaveText("1.500");
  const guardado = await leerProgreso(page);
  expect(guardado!.monedas).toBe(1500);
  expect(guardado!.compras.transacciones).toHaveLength(1);
  expect(guardado!.compras.transacciones[0]).toMatchObject({ producto: "monedas-1000", monedas: 1000 });
  await page.reload();
  await abrirTienda(page);
  await expect(saldo(page)).toHaveText("1.500");
  expect((await leerProgreso(page))!.compras.transacciones).toHaveLength(1);
  expect(vigilancia.errores).toEqual([]);
});

test("vídeo de monedas: suma 60; a las 3 h 59 min dice «Disponible en 1 min» y a las 4 h vuelve (K2)", async ({ page }) => {
  await preparar(page);
  await sembrarProgreso(page, conObjetos(0));
  await page.goto("/");
  await abrirTienda(page);
  await pestana(page, "Monedas").click();
  await page.locator("#video-monedas").click();
  await verVideoEntero(page);
  await expect(saldo(page)).toHaveText("60");
  await expect(page.locator("#video-monedas")).toBeDisabled();
  const t0 = new Date(FECHA).getTime();
  await page.clock.setFixedTime(new Date(t0 + (3 * 60 + 59) * 60_000));
  await pestana(page, "Monedas").click();
  await expect(page.locator('[data-articulo="video-monedas"] .estado')).toHaveText("Disponible en 1 min");
  await expect(page.locator("#video-monedas")).toBeDisabled();
  await page.clock.setFixedTime(new Date(t0 + 4 * 3_600_000));
  await pestana(page, "Monedas").click();
  await expect(page.locator("#video-monedas")).toBeEnabled();
  // Cerrar antes de tiempo no da nada y el botón sigue.
  await page.locator("#video-monedas").click();
  await page.getByRole("dialog", { name: "Vídeo de prueba" }).getByRole("button", { name: "Cerrar" }).click();
  await expect(saldo(page)).toHaveText("60");
  await expect(page.locator("#video-monedas")).toBeEnabled();
});

test("si otra pestaña cobra el vídeo mientras se ve, al acabar no suma otra vez ni dice que ha sumado (K2)", async ({ page }) => {
  await preparar(page);
  await sembrarProgreso(page, conObjetos(0));
  await page.goto("/");
  await abrirTienda(page);
  /** Mientras se ve el vídeo, otra pestaña guarda el premio en el progreso. */
  const cobrarEnOtraPestana = (cambio: "monedas" | "objeto") =>
    page.evaluate(
      ([clave, cambio]) => {
        const p = JSON.parse(localStorage.getItem(clave)!);
        p.recompensas = { ultimoVideoMonedas: 0, diaObjetoVideo: 0, objetosVideo: 0, ...p.recompensas };
        if (cambio === "monedas") {
          p.monedas += 60;
          p.recompensas.ultimoVideoMonedas = Date.now();
        } else {
          // Un día guardado en el futuro cuenta como hoy: el de hoy ya está gastado.
          p.objetos.cemento += 1;
          p.recompensas.diaObjetoVideo = 999_999;
          p.recompensas.objetosVideo = 1;
        }
        localStorage.setItem(clave, JSON.stringify(p));
      },
      [CLAVE_PROGRESO, cambio] as const,
    );
  await page.locator("#objeto-video-cemento").click();
  await expect(page.getByRole("dialog", { name: "Vídeo de prueba" })).toBeVisible();
  await cobrarEnOtraPestana("objeto");
  await verVideoEntero(page);
  expect((await leerProgreso(page))!.objetos.cemento).toBe(1);
  await expect(page.locator("#tienda-mensaje")).not.toContainText("tienes");
  await pestana(page, "Monedas").click();
  await page.locator("#video-monedas").click();
  await expect(page.getByRole("dialog", { name: "Vídeo de prueba" })).toBeVisible();
  await cobrarEnOtraPestana("monedas");
  await verVideoEntero(page);
  expect((await leerProgreso(page))!.monedas).toBe(60);
  await expect(saldo(page)).toHaveText("60");
  await expect(page.locator("#tienda-mensaje")).not.toContainText("+60");
});

test("un objeto gratis con vídeo al día: tras verlo, «Tienes 1» más y ningún objeto lo ofrece ya (K2)", async ({ page }) => {
  await preparar(page);
  await sembrarProgreso(page, conObjetos(0));
  await page.goto("/");
  await abrirTienda(page);
  await page.locator("#objeto-video-cemento").click();
  await verVideoEntero(page);
  await expect(page.locator('[data-articulo="cemento"]')).toHaveAttribute("data-tienes", "1");
  await expect(page.getByRole("button", { name: /gratis con vídeo/i })).toHaveCount(0);
  expect((await leerProgreso(page))!.objetos.cemento).toBe(1);
});

test("en la libre, al perder la última vida «¿Seguir?» ofrece «Ver vídeo», sin dinero real; verlo entero sigue la partida (K2)", async ({ page }) => {
  test.setTimeout(90_000);
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  // Todas las piezas al extremo: caen y cuestan una vida.
  for (let pieza = 0; pieza < 20; pieza++) {
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado === "seguir" || el.dataset.fase === "apuntando";
    });
    if ((await juego(page).getAttribute("data-estado")) === "seguir") break;
    await soltarEnExtremo(page);
  }
  await expect(juego(page)).toHaveAttribute("data-estado", "seguir");
  await expect(page.locator("#seguir-video")).toBeVisible();
  expect(await page.locator("#seguir").innerText()).not.toMatch(/€/);
  await pulsarEnSeguir(page, page.locator("#seguir-video"), page.getByRole("dialog", { name: "Vídeo de prueba" }));
  await verVideoEntero(page);
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
});
