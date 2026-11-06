// Bloque A: fuente local, efectos, sonido, háptica e interfaz.
import { expect, test, type Page } from "@playwright/test";
import { esperarLibre, preparar } from "./ayudas.ts";

test("la fuente local se carga sin peticiones a otros orígenes (A1)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const cargada = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Bricolage Grotesque Variable"');
  });
  expect(cargada).toBe(true);
  expect(vigilancia.ajenas).toEqual([]);
  expect(vigilancia.errores).toEqual([]);
});

/**
 * Durante `ms` juega sola (suelta cada pieza cerca del objetivo) y mide los
 * intervalos entre fotogramas con `requestAnimationFrame`. Devuelve mediana y p95.
 */
async function medirFotogramas(page: Page, ms: number): Promise<{ mediana: number; p95: number; fotogramas: number; piezas: number }> {
  return page.evaluate(
    (duracion) =>
      new Promise<{ mediana: number; p95: number; fotogramas: number; piezas: number }>((listo) => {
        const intervalos: number[] = [];
        let antes = performance.now();
        const desde = antes;
        let piezas = 0;
        const fotograma = (ahora: number) => {
          intervalos.push(ahora - antes);
          antes = ahora;
          const el = document.getElementById("juego")!;
          if (el.dataset.estado === "fin") document.getElementById("boton-otra-vez")!.click();
          else if (el.dataset.fase === "apuntando" && Math.abs(Number(el.dataset.x || "9") - Number(el.dataset.objetivo || "0")) <= 0.1) {
            document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            piezas++;
          }
          if (ahora - desde < duracion) return requestAnimationFrame(fotograma);
          const orden = intervalos.slice(5).sort((a, b) => a - b);
          const en = (q: number) => orden[Math.min(orden.length - 1, Math.floor(q * orden.length))]!;
          listo({ mediana: en(0.5), p95: en(0.95), fotogramas: orden.length, piezas });
        };
        requestAnimationFrame(fotograma);
      }),
    ms,
  );
}

test("fotogramas en 20 s de partida: escritorio mediana ≤ 17,5 ms y p95 ≤ 25 ms; móvil con CPU ×4 p95 ≤ 33 ms (A2)", async ({ page }, testInfo) => {
  test.skip(!!process.env.CI, "Depende del equipo: no se mide en CI");
  test.setTimeout(90_000);
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  if (testInfo.project.name === "movil") {
    // Móvil con la CPU 4 veces más lenta: objetivo p95 ≤ 33 ms (impacto, A2).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const medida = await medirFotogramas(page, 20_000);
  testInfo.annotations.push({
    type: "fotogramas",
    description: `${testInfo.project.name}: mediana ${medida.mediana.toFixed(1)} ms, p95 ${medida.p95.toFixed(1)} ms, ${medida.fotogramas} fotogramas, ${medida.piezas} piezas`,
  });
  console.log(testInfo.annotations.at(-1)!.description);
  expect(medida.piezas).toBeGreaterThanOrEqual(3);
  if (testInfo.project.name === "movil") {
    expect(medida.p95).toBeLessThanOrEqual(33);
  } else {
    expect(medida.mediana).toBeLessThanOrEqual(17.5);
    expect(medida.p95).toBeLessThanOrEqual(25);
  }
});

/**
 * Suelta la pieza dentro de la página cuando su distancia al objetivo está en
 * `[min, max]` metros (o en el extremo del vaivén con `extremo`). Devuelve
 * `false` si la partida ya ha acabado.
 */
async function soltarA(page: Page, min: number, max: number, extremo = false): Promise<boolean> {
  await page.waitForFunction(() => {
    const el = document.getElementById("juego")!;
    return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
  });
  return page.evaluate(
    ([desde, hasta, borde]) =>
      new Promise<boolean>((listo) => {
        const mirar = () => {
          const el = document.getElementById("juego")!;
          if (el.dataset.estado === "fin") return listo(false);
          const x = Number(el.dataset.x || "0");
          const d = Math.abs(x - Number(el.dataset.objetivo || "0"));
          if (el.dataset.fase === "apuntando" && (borde ? Math.abs(x) >= 3.2 : d >= desde && d <= hasta)) {
            document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            const esperar = () => (el.dataset.fase === "apuntando" && el.dataset.estado !== "fin" ? requestAnimationFrame(esperar) : listo(true));
            return requestAnimationFrame(esperar);
          }
          requestAnimationFrame(mirar);
        };
        mirar();
      }),
    [min, max, extremo] as const,
  );
}

const contadores = async (page: Page) =>
  JSON.parse((await page.locator("#juego").getAttribute("data-efectos")) ?? "{}") as Record<string, number>;

test("cada evento lanza su efecto: colocada de cada calidad, caída, vida extra e hito (A3)", async ({ page }) => {
  test.setTimeout(120_000);
  const { errores } = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  // Una caída (quedan 2 vidas), 6 perfectos (vida extra en el quinto), un bueno y normales.
  await soltarA(page, 0, 0, true);
  for (let i = 0; i < 6; i++) await soltarA(page, 0, 0.05);
  for (let intento = 0; intento < 6; intento++) {
    const c = await contadores(page);
    if (!c["colocada-bueno"]) await soltarA(page, 0.22, 0.3);
    else if (!c["colocada-normal"]) await soltarA(page, 0.38, 0.45);
    else if (!c.hito) await soltarA(page, 0, 0.05);
    else break;
    // Que dé tiempo a que aparezca la siguiente pieza y la anterior cuente como colocada.
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
    });
  }
  const c = await contadores(page);
  for (const tipo of ["soltada", "aterrizaje", "colocada-perfecto", "colocada-bueno", "colocada-normal", "caida", "vidaExtra", "hito", "confeti"]) {
    expect(c[tipo], tipo).toBeGreaterThan(0);
  }
  expect(c.sacudidaMax).toBeGreaterThan(0);
  expect(errores).toEqual([]);
});

test("con movimiento reducido no hay sacudida de cámara (A3)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { errores } = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await soltarA(page, 0, 0, true);
  await expect(page.locator("#juego")).toHaveAttribute("data-vidas", "2");
  await page.waitForTimeout(400);
  const c = await contadores(page);
  expect(c.caida).toBe(1);
  expect(c.sacudidaMax ?? 0).toBe(0);
  expect(errores).toEqual([]);
});
