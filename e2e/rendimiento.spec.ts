// A2: fotogramas de una partida en escritorio y en móvil con la CPU 4 veces
// más lenta. Va en sus propios proyectos de Playwright (`rendimiento-*`), que
// corren al final y de uno en uno: en paralelo con el resto de pruebas, la
// carga del equipo falsea la medida. No se mide en CI (máquinas compartidas).
// Desde la v3 se mide con la música sonando en un `AudioContext` real (D4), y
// se anota lo que tarda `programar` en cada fotograma.
import { expect, test, type Page } from "@playwright/test";
import { conTactil, juego, jugarLibre, preparar } from "./ayudas.ts";

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

/** Media y p95 de lo que ha tardado `programar` de la música en cada fotograma, en ms (D4). */
async function costeMusica(page: Page): Promise<{ media: number; p95: number; maximo: number; vueltas: number }> {
  return page.evaluate(() => {
    const costes = [...(window as unknown as { __costeMusica: number[] }).__costeMusica].sort((a, b) => a - b);
    const media = costes.reduce((s, c) => s + c, 0) / Math.max(1, costes.length);
    return { media, p95: costes[Math.min(costes.length - 1, Math.floor(0.95 * costes.length))] ?? 0, maximo: costes.at(-1) ?? 0, vueltas: costes.length };
  });
}

test("fotogramas en 20 s de partida con música: escritorio mediana ≤ 17,5 ms y p95 ≤ 25 ms; móvil con CPU ×4 p95 ≤ 33 ms (A2, D4)", async ({ page }, testInfo) => {
  test.skip(!!process.env.CI, "Depende del equipo: no se mide en CI");
  test.setTimeout(90_000);
  await preparar(page, undefined, { audioReal: true });
  await page.goto("/");
  await jugarLibre(page);
  // Abrir el dispositivo de audio tarda de 0,4 a 6 s en este equipo: se mide cuando la música ya suena.
  await expect.poll(async () => Number((await juego(page).getAttribute("data-notas")) ?? "0"), { timeout: 20_000 }).toBeGreaterThan(0);
  await page.evaluate(() => ((window as unknown as { __costeMusica: number[] }).__costeMusica = []));
  if (conTactil(testInfo)) {
    // Móvil con la CPU 4 veces más lenta: objetivo p95 ≤ 33 ms (impacto, A2).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const medida = await medirFotogramas(page, 20_000);
  const musica = await costeMusica(page);
  testInfo.annotations.push({
    type: "fotogramas",
    description:
      `${testInfo.project.name}: mediana ${medida.mediana.toFixed(1)} ms, p95 ${medida.p95.toFixed(1)} ms, ${medida.fotogramas} fotogramas, ${medida.piezas} piezas; ` +
      `música por fotograma: media ${musica.media.toFixed(3)} ms, p95 ${musica.p95.toFixed(2)} ms, máximo ${musica.maximo.toFixed(2)} ms en ${musica.vueltas} vueltas`,
  });
  console.log(testInfo.annotations.at(-1)!.description);
  expect(musica.vueltas).toBeGreaterThan(100);
  expect(medida.piezas).toBeGreaterThanOrEqual(3);
  if (conTactil(testInfo)) {
    expect(medida.p95).toBeLessThanOrEqual(33);
  } else {
    expect(medida.mediana).toBeLessThanOrEqual(17.5);
    expect(medida.p95).toBeLessThanOrEqual(25);
  }
});
