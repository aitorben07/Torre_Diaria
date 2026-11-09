// Bloque D (tercera versión): música por capas con el `AudioContext` falso de
// `ayudas.ts`, que pasa a `running` y cuenta los nodos que acaban en la salida
// de música y en la de efectos. Se espera siempre a un contador (`data-notas`,
// `data-musica` o la cuenta de nodos), no a un tiempo; solo las pruebas de
// «no se programa nada en 2 s» dejan pasar ese tiempo a propósito.
import { expect, test, type Page } from "@playwright/test";
import { abrirAjustes, conTactil, cuentaAudio, esperarInicio, irAlInicio, juego, jugarHastaElFin, jugarLibre, leerProgreso, pausar, preparar, sembrarProgreso, soltarEnExtremo } from "./ayudas.ts";

/** Notas programadas por la música (`data-notas`). */
const notas = async (page: Page) => Number((await juego(page).getAttribute("data-notas")) ?? "0");

/** Pulsa un interruptor de Ajustes con un toque o un clic, según el proyecto. */
async function pulsar(page: Page, nombre: string, tactil: boolean): Promise<void> {
  const boton = page.getByRole("switch", { name: nombre });
  const antes = await boton.getAttribute("aria-checked");
  if (tactil) await boton.tap();
  else await boton.click();
  await expect(boton).toHaveAttribute("aria-checked", antes === "true" ? "false" : "true");
}

/** Suelta la pieza dentro de la página cuando pasa a `max` metros del objetivo o menos (un perfecto con 0,05). */
async function soltarCerca(page: Page, max: number): Promise<void> {
  await page.waitForFunction(() => {
    const el = document.getElementById("juego")!;
    return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
  });
  await page.evaluate(
    (hasta) =>
      new Promise<void>((listo) => {
        const mirar = () => {
          const el = document.getElementById("juego")!;
          if (el.dataset.estado === "fin") return listo();
          if (el.dataset.fase === "apuntando" && Math.abs(Number(el.dataset.x || "9") - Number(el.dataset.objetivo || "0")) <= hasta) {
            document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            const esperar = () => (el.dataset.fase === "apuntando" && el.dataset.estado !== "fin" ? requestAnimationFrame(esperar) : listo());
            return requestAnimationFrame(esperar);
          }
          requestAnimationFrame(mirar);
        };
        mirar();
      }),
    max,
  );
}

/** Espera `ms` y comprueba que en ese tiempo no se ha programado ninguna nota. */
async function sinNotasDurante(page: Page, ms: number): Promise<void> {
  // Un fotograma de margen, por si la última vuelta antes de parar ya estaba en marcha.
  await page.evaluate(() => new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo))));
  const antes = await notas(page);
  await page.waitForTimeout(ms);
  expect(await notas(page)).toBe(antes);
}

test("antes del primer gesto no hay AudioContext ni nodos; «Jugar» abre uno solo y suena la música de la partida (D1, D3)", async ({ page }) => {
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  await esperarInicio(page);
  // La pista se dice aunque el contexto aún no exista (impacto §5).
  await expect(juego(page)).toHaveAttribute("data-musica", /^inicio:/);
  await expect(juego(page)).toHaveAttribute("data-notas", "0");
  expect(await cuentaAudio(page)).toEqual({ contextos: 0, nodos: 0, musica: 0, efectos: 0 });
  await jugarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-musica", /^partida:/);
  await expect.poll(async () => (await cuentaAudio(page)).musica).toBeGreaterThan(0);
  expect((await cuentaAudio(page)).contextos).toBe(1);
  await soltarEnExtremo(page);
  await expect.poll(async () => (await cuentaAudio(page)).efectos).toBeGreaterThan(0);
  expect((await cuentaAudio(page)).contextos).toBe(1);
  expect(errores).toEqual([]);
});

test("el primer gesto en el inicio hace sonar la música del inicio; al acabar, el motivo de fin; e «Inicio» vuelve a ella (D3)", async ({ page }, testInfo) => {
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  // Abrir y cerrar Ajustes es un gesto que no sale del inicio.
  await abrirAjustes(page);
  await page.keyboard.press("Escape");
  await esperarInicio(page);
  await expect.poll(() => notas(page)).toBeGreaterThan(0);
  await expect(juego(page)).toHaveAttribute("data-musica", "inicio:1");
  await page.locator("#inicio-jugar").click();
  // La de partida entra al empezar el compás siguiente del inicio (como mucho 2,7 s).
  await expect(juego(page)).toHaveAttribute("data-musica", /^partida:/);
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(juego(page)).toHaveAttribute("data-musica", "fin:0");
  await irAlInicio(page);
  await expect(juego(page)).toHaveAttribute("data-musica", "inicio:1");
  const enInicio = await notas(page);
  await expect.poll(() => notas(page)).toBeGreaterThan(enInicio);
  expect(errores).toEqual([]);
});

test("con la Música apagada, en 5 s de partida no se crea ningún nodo de música y los efectos suenan; se guarda al recargar (C2, D1)", async ({ page }, testInfo) => {
  const tactil = conTactil(testInfo);
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  await abrirAjustes(page);
  await pulsar(page, "Música", tactil);
  await page.keyboard.press("Escape");
  // El toque que abrió Ajustes ya pudo hacer sonar el inicio: se cuenta desde aquí.
  await jugarLibre(page);
  const antes = await cuentaAudio(page);
  const notasAntes = await notas(page);
  const desde = Date.now();
  // Piezas al mar y cerca del objetivo durante al menos 5 s.
  for (let i = 0; Date.now() - desde < 5000 && i < 12; i++) await (i % 2 === 0 ? soltarCerca(page, 0.3) : soltarEnExtremo(page));
  await expect.poll(async () => (await cuentaAudio(page)).efectos).toBeGreaterThan(antes.efectos);
  const cuenta = await cuentaAudio(page);
  expect(cuenta.musica).toBe(antes.musica);
  expect(cuenta.contextos).toBe(1);
  expect(await notas(page)).toBe(notasAntes);
  expect((await leerProgreso(page))!.ajustes).toMatchObject({ musica: false, sonido: true });
  await page.reload();
  await abrirAjustes(page);
  await expect(page.getByRole("switch", { name: "Música" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: "Sonidos" })).toHaveAttribute("aria-checked", "true");
  expect(errores).toEqual([]);
});

test("con Sonidos apagado y Música encendida, soltar no crea nodos de efectos y la música sigue; con los dos apagados, ningún nodo (C2)", async ({ page }, testInfo) => {
  const tactil = conTactil(testInfo);
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  await abrirAjustes(page);
  await pulsar(page, "Sonidos", tactil);
  await page.keyboard.press("Escape");
  await jugarLibre(page);
  await expect.poll(async () => (await cuentaAudio(page)).musica).toBeGreaterThan(0);
  const antes = await notas(page);
  for (let i = 0; i < 3; i++) await soltarCerca(page, 0.3);
  await soltarEnExtremo(page);
  await expect.poll(() => notas(page)).toBeGreaterThan(antes);
  expect((await cuentaAudio(page)).efectos).toBe(0);

  // Los dos apagados desde el principio: ni contexto ni nodos.
  await sembrarProgreso(page, { ajustes: { sonido: false, vibracion: true, tutorialVisto: true, musica: false } }, false);
  await page.reload();
  await abrirAjustes(page);
  await expect(page.getByRole("switch", { name: "Música" })).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await jugarLibre(page);
  for (let i = 0; i < 2; i++) await soltarCerca(page, 0.3);
  await soltarEnExtremo(page);
  await expect(juego(page)).toHaveAttribute("data-notas", "0");
  expect(await cuentaAudio(page)).toEqual({ contextos: 0, nodos: 0, musica: 0, efectos: 0 });
  expect(errores).toEqual([]);
});

test("quien tenía el sonido apagado en la v2 tiene también la música apagada (C1, T7)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo DOM: basta con escritorio (R17)");
  await sembrarProgreso(page, { ajustes: { sonido: false, vibracion: true, tutorialVisto: true } });
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  await abrirAjustes(page);
  await expect(page.getByRole("switch", { name: "Música" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: "Sonidos" })).toHaveAttribute("aria-checked", "false");
  // Ajustes ya es un gesto: con todo apagado sigue sin crearse el contexto.
  expect((await cuentaAudio(page)).contextos).toBe(0);
  expect(errores).toEqual([]);
});

test("en la pausa no se programa ninguna nota en 2 s y al seguir vuelve la música (D1)", async ({ page }) => {
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  await jugarLibre(page);
  await expect.poll(() => notas(page)).toBeGreaterThan(0);
  await pausar(page);
  await sinNotasDurante(page, 2000);
  // Con Ajustes abiertos sobre la pausa, tampoco.
  await page.locator("#pausa-ajustes").click();
  await expect(juego(page)).toHaveAttribute("data-estado", "ajustes");
  await sinNotasDurante(page, 500);
  await page.keyboard.press("Escape");
  const enPausa = await notas(page);
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect.poll(() => notas(page)).toBeGreaterThan(enPausa);
  expect(errores).toEqual([]);
});

test("con la pestaña oculta en el inicio no se programa ninguna nota en 2 s; al volver, sí (D1)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo el reloj del audio: basta con escritorio (R17)");
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  await abrirAjustes(page);
  await page.keyboard.press("Escape");
  await expect.poll(() => notas(page)).toBeGreaterThan(0);
  const ocultar = (oculta: boolean) =>
    page.evaluate((valor) => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => valor });
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (valor ? "hidden" : "visible") });
      document.dispatchEvent(new Event("visibilitychange"));
    }, oculta);
  await ocultar(true);
  await sinNotasDurante(page, 2000);
  const oculta = await notas(page);
  await ocultar(false);
  // Volver a la pestaña no es un gesto: el contexto se reanuda solo si ya existía.
  await expect.poll(() => notas(page)).toBeGreaterThan(oculta);
  expect(errores).toEqual([]);
});

test("con combo 4 la música pasa a la capa 2 al empezar el compás y tras una caída baja (D3)", async ({ page }) => {
  test.setTimeout(120_000);
  const { errores } = await preparar(page, undefined, { audioFalso: true });
  await page.goto("/");
  await jugarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-musica", "partida:0");
  // Perfectos (a 5 cm o menos) hasta combo 4: si alguno sale peor, el combo vuelve a empezar.
  const combo = async () => Number((await page.locator("#combo").getAttribute("data-combo")) ?? "0");
  for (let i = 0; i < 30 && (await combo()) < 4; i++) await soltarCerca(page, 0.05);
  expect(await combo()).toBeGreaterThanOrEqual(4);
  await expect(juego(page)).toHaveAttribute("data-musica", "partida:2");
  await soltarEnExtremo(page);
  await expect.poll(async () => Number(((await juego(page).getAttribute("data-musica")) ?? "").split(":")[1])).toBeLessThan(2);
  expect(errores).toEqual([]);
});
