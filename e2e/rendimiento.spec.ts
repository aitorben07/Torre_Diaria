// A2: fotogramas de una partida en escritorio y en móvil con la CPU 4 veces
// más lenta. Va en sus propios proyectos de Playwright (`rendimiento-*`), que
// corren al final y de uno en uno: en paralelo con el resto de pruebas, la
// carga del equipo falsea la medida. No se mide en CI (máquinas compartidas).
import { expect, test, type Page } from "@playwright/test";
import { conTactil, esperarLibre, preparar } from "./ayudas.ts";

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
  if (conTactil(testInfo)) {
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
  if (conTactil(testInfo)) {
    expect(medida.p95).toBeLessThanOrEqual(33);
  } else {
    expect(medida.mediana).toBeLessThanOrEqual(17.5);
    expect(medida.p95).toBeLessThanOrEqual(25);
  }
});
