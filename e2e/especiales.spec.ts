// H3 de la tercera versión: las piezas especiales en pantalla. La partida
// libre `libre-6f4` tiene dorada en la pieza 8, pegajosa en la 16 y cemento en
// la 24 (buscada con `especialDe`). Se espera siempre a contadores o atributos
// (`data-efectos`, `data-especial`, `data-pasos`), nunca a un tiempo fijo.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { especialDe, type Especial } from "../src/logica/especiales.ts";
import { jugar } from "../src/logica/simulacion.ts";
import { datosFin, juego, leerProgreso, preparar, soltarEnExtremo } from "./ayudas.ts";

const CODIGO = "6f4";
const CAPTURAS = new URL("../docs/proceso/tercera-version/capturas/", import.meta.url);

/** Abre el enlace de la partida libre `libre-6f4` y la empieza. */
async function empezarPartida(page: Page): Promise<void> {
  await page.goto(`/?libre=${CODIGO}.100`);
  await page.getByRole("button", { name: "Jugar esta partida" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(juego(page)).toHaveAttribute("data-semilla", `libre-${CODIGO}`);
}

/** Contador de `data-efectos` (0 si aún no hay). */
function contador(page: Page, tipo: string): Promise<number> {
  return page.evaluate((t) => (JSON.parse(document.getElementById("juego")!.dataset.efectos ?? "{}") as Record<string, number>)[t] ?? 0, tipo);
}

const pasos = async (page: Page) => Number(await juego(page).getAttribute("data-pasos"));

/**
 * Suelta la pieza dentro de la página en el fotograma en que pasa sobre el
 * objetivo (perfecto) y espera a que el contador de soltadas suba.
 */
async function soltarCentrada(page: Page): Promise<void> {
  await page.waitForFunction(() => document.getElementById("juego")!.dataset.fase === "apuntando");
  const antes = await contador(page, "soltada");
  await page.evaluate(
    () =>
      new Promise<void>((listo) => {
        const mirar = () => {
          const el = document.getElementById("juego")!;
          if (el.dataset.estado === "fin") return listo();
          if (el.dataset.fase === "apuntando" && Math.abs(Number(el.dataset.x || "9") - Number(el.dataset.objetivo || "0")) <= 0.08) {
            document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            return listo();
          }
          requestAnimationFrame(mirar);
        };
        mirar();
      }),
  );
  // En cada fotograma (expect.poll mira cada 100 a 1.000 ms y las capturas llegarían tarde).
  await page.waitForFunction(
    (n) => ((JSON.parse(document.getElementById("juego")!.dataset.efectos ?? "{}") as { soltada?: number }).soltada ?? 0) > n,
    antes,
    { polling: "raf" },
  );
}

/** Suelta centradas hasta que cuelga la pieza `indice` (las anteriores, todas sobre el objetivo). */
async function llegarA(page: Page, indice: number): Promise<void> {
  while ((await contador(page, "soltada")) < indice) await soltarCentrada(page);
  await page.waitForFunction(() => document.getElementById("juego")!.dataset.fase === "apuntando");
}

test("la semilla de la prueba tiene dorada en la 8, pegajosa en la 16 y cemento en la 24", () => {
  const semilla = `libre-${CODIGO}`;
  expect([8, 16, 24].map((i) => especialDe(semilla, i))).toEqual(["dorada", "pegajosa", "cemento"]);
  expect(Array.from({ length: 8 }, (_, i) => especialDe(semilla, i)).every((e) => e === null)).toBe(true);
});

test("la primera dorada avisa sin parar la partida; al volver a llegar ya no avisa", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Solo DOM: basta con escritorio (R17)");
  test.setTimeout(150_000);
  const vigilancia = await preparar(page);
  await empezarPartida(page);
  await llegarA(page, 8);
  await expect(juego(page)).toHaveAttribute("data-especial", "dorada");
  const aviso = page.locator("#aviso-especial");
  await expect(aviso).toBeVisible();
  await expect(aviso).toHaveText("Pieza dorada: vale el doble");
  // El aviso no para la partida: los pasos siguen subiendo mientras se ve.
  const antes = await pasos(page);
  await expect.poll(() => pasos(page)).toBeGreaterThan(antes + 20);
  await expect(aviso).toBeVisible();
  expect((await leerProgreso(page))?.vistos).toEqual(["dorada"]);
  // La dorada colocada: su efecto suma en data-efectos.
  await soltarCentrada(page);
  await expect.poll(() => contador(page, "especial-dorada")).toBe(1);
  await expect(aviso).toBeHidden();

  await page.reload();
  await empezarPartida(page);
  await llegarA(page, 8);
  await expect(juego(page)).toHaveAttribute("data-especial", "dorada");
  const ahora = await pasos(page);
  await expect.poll(() => pasos(page)).toBeGreaterThan(ahora + 20);
  await expect(aviso).toBeHidden();
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("las tres especiales se ven en el gancho, actúan y la partida equivale a jugar() en Node", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Una partida larga basta con escritorio (R17)");
  test.setTimeout(300_000);
  const vigilancia = await preparar(page);
  await empezarPartida(page);
  const textos: Record<Especial, string> = {
    dorada: "Pieza dorada: vale el doble",
    pegajosa: "Pieza pegajosa: se queda pegada donde cae",
    cemento: "Pieza de cemento: convierte en piedra lo de debajo",
  };
  for (const [indice, especial] of [[8, "dorada"], [16, "pegajosa"], [24, "cemento"]] as const) {
    await llegarA(page, indice);
    await expect(juego(page)).toHaveAttribute("data-especial", especial);
    await expect(page.locator("#aviso-especial")).toHaveText(textos[especial]);
    await soltarCentrada(page);
    // La de cemento actúa al soltar la siguiente.
    if (especial === "cemento") await soltarCentrada(page);
    await expect.poll(() => contador(page, `especial-${especial}`)).toBe(1);
  }
  // La siguiente a una especial ya es normal.
  await page.waitForFunction(() => document.getElementById("juego")!.dataset.fase === "apuntando");
  await expect(juego(page)).not.toHaveAttribute("data-especial", /.+/);

  while ((await juego(page).getAttribute("data-estado")) !== "fin") await soltarEnExtremo(page);
  const fin = await datosFin(page);
  const enNode = jugar(fin.semilla, fin.toques, { ...fin.opciones, ayudas: fin.ayudas });
  expect(enNode.terminada).toBe(true);
  expect(enNode.puntos).toBe(fin.puntos);
  expect(enNode.altura).toBeCloseTo(fin.altura, 9);
  expect(enNode.doradas).toBe(1);
  expect(enNode.formas.filter((f) => f.especial).map((f) => f.especial)).toEqual(["dorada", "pegajosa", "cemento"]);
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

// Capturas de las especiales para el revisor (H3): solo con CAPTURAS=1, como `capturas.spec.ts`.
for (const [nombre, ancho, alto] of [
  ["movil", 390, 844],
  ["escritorio", 1280, 800],
] as const) {
  test(`capturas de las especiales ${nombre} ${ancho}x${alto}`, async ({ browser }, testInfo) => {
    test.skip(!process.env.CAPTURAS, "Solo con CAPTURAS=1");
    test.skip(testInfo.project.name !== "escritorio", "Una vez basta");
    test.setTimeout(300_000);
    mkdirSync(CAPTURAS, { recursive: true });
    const contexto = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: nombre === "movil" ? 2 : 1, hasTouch: nombre === "movil" });
    const page = await contexto.newPage();
    await preparar(page);
    await empezarPartida(page);
    await page.evaluate(() => document.fonts.ready);
    const guardar = (paso: string) => page.screenshot({ path: fileURLToPath(new URL(`${nombre}-${paso}.png`, CAPTURAS)) });
    for (const [indice, especial] of [[8, "dorada"], [16, "pegajosa"], [24, "cemento"]] as const) {
      await llegarA(page, indice);
      await expect(juego(page)).toHaveAttribute("data-especial", especial);
      // Con la pieza cerca del centro, para que se vea entera sobre la torre.
      await page.waitForFunction(() => Math.abs(Number(document.getElementById("juego")!.dataset.x || "9")) < 0.6);
      await guardar(`especial-${especial}-gancho`);
      await soltarCentrada(page);
      if (especial === "cemento") await soltarCentrada(page);
      // En el fotograma en que salta el efecto (expect.poll mira cada 100 a 1.000 ms) y 120 ms después.
      await page.waitForFunction(
        (tipo) => ((JSON.parse(document.getElementById("juego")!.dataset.efectos ?? "{}") as Record<string, number>)[tipo] ?? 0) >= 1,
        `especial-${especial}`,
        { polling: "raf" },
      );
      await page.waitForTimeout(120);
      // La captura tarda más que el efecto: se congela el bucle de fotogramas mientras se toma y luego sigue.
      await page.evaluate(() => {
        const ventana = window as unknown as { rafOriginal?: typeof requestAnimationFrame; rafPendiente?: FrameRequestCallback };
        ventana.rafOriginal = window.requestAnimationFrame;
        window.requestAnimationFrame = (cb) => {
          ventana.rafPendiente = cb;
          return 0;
        };
      });
      await page.waitForFunction(() => (window as unknown as { rafPendiente?: unknown }).rafPendiente !== undefined);
      await guardar(`especial-${especial}-efecto`);
      await page.evaluate(() => {
        const ventana = window as unknown as { rafOriginal: typeof requestAnimationFrame; rafPendiente?: FrameRequestCallback };
        window.requestAnimationFrame = ventana.rafOriginal;
        const pendiente = ventana.rafPendiente!;
        delete ventana.rafPendiente;
        window.requestAnimationFrame(pendiente);
      });
    }
    await contexto.close();
  });
}
