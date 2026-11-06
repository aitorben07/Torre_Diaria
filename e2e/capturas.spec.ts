// A2: capturas para el revisor (inicio, partida a mitad, perfecto, caída y fin)
// en 390×844 y 1280×800. Solo con `CAPTURAS=1`: no es una prueba, guarda PNG en
// docs/proceso/segunda-version/capturas/ (fuera de dist/).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { esperarLibre, juego, preparar } from "./ayudas.ts";

const CARPETA = new URL("../docs/proceso/segunda-version/capturas/", import.meta.url);

test.skip(!process.env.CAPTURAS, "Solo con CAPTURAS=1");

/** Suelta la pieza dentro de la página cuando pasa a `distancia` metros o menos del objetivo. */
async function soltarCentrada(page: Page, distancia = 0.05): Promise<void> {
  await page.waitForFunction(() => {
    const el = document.getElementById("juego")!;
    return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
  });
  await page.evaluate(
    (maximo) =>
      new Promise<void>((listo) => {
        const mirar = () => {
          const el = document.getElementById("juego")!;
          if (el.dataset.estado === "fin") return listo();
          if (Math.abs(Number(el.dataset.x || "9") - Number(el.dataset.objetivo || "0")) <= maximo) {
            document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            return listo();
          }
          requestAnimationFrame(mirar);
        };
        mirar();
      }),
    distancia,
  );
  await page.waitForFunction(() => document.getElementById("juego")!.dataset.fase !== "apuntando");
}

async function soltarEnExtremo(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const el = document.getElementById("juego")!;
    return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
  });
  if ((await juego(page).getAttribute("data-estado")) === "fin") return;
  await page.evaluate(
    () =>
      new Promise<void>((listo) => {
        const mirar = () => {
          const el = document.getElementById("juego")!;
          if (el.dataset.estado === "fin") return listo();
          if (Math.abs(Number(el.dataset.x || "0")) >= 3.2) {
            document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            return listo();
          }
          requestAnimationFrame(mirar);
        };
        mirar();
      }),
  );
}

for (const [nombre, ancho, alto] of [
  ["movil", 390, 844],
  ["escritorio", 1280, 800],
] as const) {
  test(`capturas ${nombre} ${ancho}x${alto}`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "Una vez basta");
    test.setTimeout(240_000);
    mkdirSync(CARPETA, { recursive: true });
    const contexto = await browser.newContext({
      viewport: { width: ancho, height: alto },
      deviceScaleFactor: nombre === "movil" ? 2 : 1,
      hasTouch: nombre === "movil",
    });
    const page = await contexto.newPage();
    await preparar(page);
    await page.goto("/");
    await esperarLibre(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const guardar = (paso: string) => page.screenshot({ path: fileURLToPath(new URL(`${nombre}-${paso}.png`, CARPETA)) });
    await guardar("1-inicio");

    for (let i = 0; i < 11; i++) {
      await soltarCentrada(page);
      if (i === 3) {
        await page.waitForTimeout(260);
        await guardar("3-perfecto");
      }
    }
    await page.waitForFunction(() => document.getElementById("juego")!.dataset.fase === "apuntando");
    await page.waitForTimeout(400);
    await guardar("2-mitad");

    await soltarEnExtremo(page);
    await page.waitForTimeout(650);
    await guardar("4-caida");
    while ((await juego(page).getAttribute("data-estado")) !== "fin") {
      await soltarEnExtremo(page).catch(() => undefined);
      await page.waitForTimeout(100);
    }
    await expect(juego(page)).toHaveAttribute("data-estado", "fin");
    await page.waitForTimeout(1200);
    await guardar("5-fin");
    await contexto.close();
  });
}
