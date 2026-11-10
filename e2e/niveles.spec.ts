// E3 y F1: mapa de niveles a pantalla completa con su ventana, ganar el nivel 1
// y equivalencia de un nivel con `jugar()` en Node (G3). Lo que es solo DOM o
// maquetación va en escritorio (R17).
import { expect, test, type Page } from "@playwright/test";
import { jugar } from "../src/logica/simulacion.ts";
import { abrirNiveles, conTactil, datosFin, esperarFinListo, juego, jugarHastaElFin, leerProgreso, preparar, sembrarProgreso } from "./ayudas.ts";

test("con progreso nuevo solo el nivel 1 se puede pulsar (E3)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await page.goto("/");
  await abrirNiveles(page);
  await expect(page.locator("#nivel-1")).toBeEnabled();
  for (let n = 2; n <= 10; n++) await expect(page.locator(`#nivel-${n}`)).toBeDisabled();
  await expect(page.locator("#niveles-jugar")).toHaveText("Jugar nivel 1");
  await page.locator("#nivel-1").click();
  await expect(page.locator("#ficha-nivel-titulo")).toHaveText("Nivel 1");
  await expect(page.locator("#ficha-nivel-objetivo")).toHaveText("Coloca 5 piezas");
  await page.locator("#ventana-nivel-cerrar").click();
  // Al volver, se vuelve al inicio, de donde se abrió (E1).
  await page.getByRole("button", { name: "Volver" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "inicio");
  expect(vigilancia.errores).toEqual([]);
});

test("ganar el nivel 1 muestra estrellas, desbloquea el 2 y se mantiene tras recargar (E3)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await abrirNiveles(page);
  await page.getByRole("button", { name: "Jugar nivel 1", exact: true }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "nivel");
  await expect(juego(page)).toHaveAttribute("data-nivel", "1");
  await expect(page.locator("#hud-meta")).toHaveText("Meta: 5 piezas");
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 10 });
  await expect(juego(page)).toHaveAttribute("data-victoria", "true");
  const estrellas = Number(await juego(page).getAttribute("data-estrellas"));
  expect(estrellas).toBeGreaterThanOrEqual(1);
  await expect(page.locator("#fin-estrellas")).toHaveAttribute("data-estrellas", String(estrellas));
  await expect(page.locator("#fin-estrellas svg.estrella.llena")).toHaveCount(estrellas);
  await expect(page.locator("#fin-titulo")).toHaveText("Nivel 1");
  await expect(page.locator("#fin-monedas")).toBeVisible();
  await expect(page.locator("#boton-otra-vez")).toHaveText("Siguiente nivel");
  expect((await leerProgreso(page))?.niveles).toEqual({ 1: estrellas });

  // Volver al mapa desde el fin centra el 2, el siguiente disponible (F1).
  await esperarFinListo(page);
  await page.locator("#boton-mapa").click();
  await expect(juego(page)).toHaveAttribute("data-estado", "niveles");
  await expect(page.locator("#niveles-jugar")).toHaveText("Jugar nivel 2");
  await comprobarCentrado(page, 2);

  await page.reload();
  await abrirNiveles(page);
  await expect(page.locator("#nivel-2")).toBeEnabled();
  await expect(page.locator("#nivel-3")).toBeDisabled();
  await expect(page.locator("#nivel-1")).toHaveAttribute("data-estrellas", String(estrellas));
  // El último disponible es el del botón y el que queda centrado al abrir.
  await expect(page.locator("#niveles-jugar")).toHaveText("Jugar nivel 2");
  await comprobarCentrado(page, 2);
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("«Siguiente nivel» juega el 2 y «Mapa» abre el mapa (E3)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await sembrarProgreso(page, { niveles: {} });
  await preparar(page);
  await page.goto("/");
  await abrirNiveles(page);
  await page.getByRole("button", { name: "Jugar nivel 1", exact: true }).click();
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 10 });
  await esperarFinListo(page);
  await page.locator("#boton-mapa").click();
  await expect(juego(page)).toHaveAttribute("data-estado", "niveles");
  await page.getByRole("button", { name: "Volver" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  await page.locator("#boton-otra-vez").click();
  await expect(juego(page)).toHaveAttribute("data-nivel", "2");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
});

test("al abrir el mapa con el nivel 8 disponible, su ficha queda visible sin desplazarse (E3)", async ({ page }) => {
  await sembrarProgreso(page, { niveles: { 1: 3, 2: 3, 3: 2, 4: 1, 5: 3, 6: 2, 7: 1 } });
  await preparar(page);
  await page.goto("/");
  await abrirNiveles(page);
  await expect(page.locator("#niveles-jugar")).toHaveText("Jugar nivel 8");
  await expect(page.locator("#nivel-8")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#nivel-8")).toBeEnabled();
  await expect(page.locator("#nivel-9")).toBeDisabled();
  await expect(page.locator("#niveles-estrellas")).toHaveText("15");
  // La tarjeta del inicio dice el siguiente nivel y las estrellas (E2).
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Niveles/ })).toHaveAttribute("aria-label", "Niveles: nivel 8, 15 estrellas");
  await expect(page.locator("#tarjeta-nivel")).toHaveText("Nivel 8");
  await expect(page.locator("#tarjeta-estrellas")).toHaveText("15");
});

test("perder un nivel ofrece Repetir y Mapa; el nivel en pantalla equivale a jugar() en Node (E3, G3)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, { niveles: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } });
  await page.goto("/");
  await abrirNiveles(page);
  // El 7: una sola vida; dos piezas centradas y la tercera en el extremo, que cae.
  await page.getByRole("button", { name: "Jugar nivel 7", exact: true }).click();
  await expect(juego(page)).toHaveAttribute("data-nivel", "7");
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 2 });
  await expect(juego(page)).toHaveAttribute("data-victoria", "false");
  await expect(page.locator("#boton-otra-vez")).toHaveText("Repetir");
  await expect(page.locator("#boton-mapa")).toBeVisible();
  await expect(page.locator("#boton-repetir-nivel")).toBeHidden();
  await expect(page.locator("#fin-objetivo")).toHaveText("Sin superar: Coloca 16 piezas con 1 vida");

  const fin = await datosFin(page);
  expect(fin.semilla).toBe("nivel-7");
  const enNode = jugar(fin.semilla, fin.toques, { ...fin.opciones, ayudas: fin.ayudas });
  expect(enNode.terminada).toBe(true);
  expect(enNode.victoria).toBe(false);
  expect(enNode.puntos).toBe(fin.puntos);
  expect(enNode.altura).toBeCloseTo(fin.altura, 9);
  // Perder no guarda estrellas.
  expect((await leerProgreso(page))?.niveles[7]).toBeUndefined();
  expect(vigilancia.errores).toEqual([]);
});

type Caja = { x: number; y: number; width: number; height: number };
const SE_CRUZAN = (a: Caja, b: Caja) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Cajas del nivel `n`, del mapa y de las fichas del margen (las de arriba y «Jugar nivel N»). */
function medirMapa(page: Page, n: number) {
  return page.evaluate((n) => {
    const caja = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const mapa = document.getElementById("mapa")!;
    const margenes = [...document.querySelectorAll(".niveles-arriba > *, #niveles-jugar")].map((el) => ({ id: el.id || el.className, caja: caja(el) }));
    const ficha = caja(document.getElementById(`nivel-${n}`)!);
    // Desplazamiento que deja el nivel en el centro, dentro de lo que el mapa permite.
    const ideal = mapa.scrollTop + ficha.y + ficha.height / 2 - (mapa.getBoundingClientRect().y + mapa.clientHeight / 2);
    const posible = Math.min(Math.max(ideal, 0), mapa.scrollHeight - mapa.clientHeight);
    return { mapa: caja(mapa), zona: caja(document.getElementById("zona")!), ficha, margenes, scrollTop: mapa.scrollTop, posible, ancho: document.documentElement.scrollWidth };
  }, n);
}

/** El nivel `n` está entero a la vista, centrado hasta donde el mapa deja y sin ninguna ficha del margen encima (F1). */
async function comprobarCentrado(page: Page, n: number, caso = `nivel ${n}`): Promise<void> {
  await expect(page.locator(`#nivel-${n}`)).toBeInViewport({ ratio: 1 });
  const m = await medirMapa(page, n);
  expect(Math.abs(m.scrollTop - m.posible), `${caso}: centrado`).toBeLessThanOrEqual(2);
  expect(m.ficha.y, caso).toBeGreaterThanOrEqual(m.mapa.y);
  expect(m.ficha.y + m.ficha.height, caso).toBeLessThanOrEqual(m.mapa.y + m.mapa.height);
  for (const margen of m.margenes) expect(SE_CRUZAN(m.ficha, margen.caja), `${caso}: ${margen.id} tapa el nivel`).toBe(false);
}

test("el mapa ocupa al menos el 85 % del alto de la zona, dentro de la columna, y no se ven el HUD ni la barra (F1)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo maquetación: basta con escritorio (R17)");
  await preparar(page);
  for (const tam of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(tam);
    await page.goto("/");
    await abrirNiveles(page);
    const caso = `${tam.width}×${tam.height}`;
    const m = await medirMapa(page, 1);
    expect(m.mapa.height, caso).toBeGreaterThanOrEqual(0.85 * m.zona.height);
    // En escritorio, la columna de 9:16 centrada; en el móvil, todo el ancho.
    const columna = Math.min(tam.width, tam.height * 0.5625);
    expect(m.mapa.width, caso).toBeLessThanOrEqual(columna + 1);
    expect(Math.abs(m.mapa.x + m.mapa.width / 2 - tam.width / 2), caso).toBeLessThanOrEqual(1);
    await expect(page.locator("#hud"), caso).toBeHidden();
    await expect(page.locator(".barra, #barra"), caso).toHaveCount(0);
  }
});

test("con el nivel 8 disponible, su ficha está entera a la vista y no la tapa ninguna ficha del margen, sin desplazamiento horizontal (F1, R15)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo maquetación: basta con escritorio (R17)");
  await sembrarProgreso(page, { niveles: { 1: 3, 2: 3, 3: 2, 4: 1, 5: 3, 6: 2, 7: 1 } }, false);
  await preparar(page);
  for (const tam of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
    { width: 1280, height: 600 },
  ]) {
    await page.setViewportSize(tam);
    await page.goto("/");
    await abrirNiveles(page);
    const caso = `${tam.width}×${tam.height}`;
    await comprobarCentrado(page, 8, caso);
    expect((await medirMapa(page, 8)).ancho, caso).toBeLessThanOrEqual(tam.width);
    // La ventana del nivel tampoco se sale por los lados.
    await page.locator("#nivel-8").click();
    await expect(page.locator("#ventana-nivel")).toBeVisible();
    const ventana = await page.locator("#ventana-nivel .ventana-papel").boundingBox();
    expect(ventana!.x, caso).toBeGreaterThanOrEqual(0);
    expect(ventana!.x + ventana!.width, caso).toBeLessThanOrEqual(tam.width);
    expect(ventana!.y + ventana!.height, caso).toBeLessThanOrEqual(tam.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), caso).toBeLessThanOrEqual(tam.width);
  }
});

test("«Jugar nivel N» empieza el N con un clic; tocar un nivel abre su ventana, que cierran Escape y «Cerrar»; los candados no responden (F1)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, { niveles: { 1: 3, 2: 3, 3: 2, 4: 1, 5: 3, 6: 2, 7: 1 } });
  await page.goto("/");
  await abrirNiveles(page);
  const ventana = page.locator("#ventana-nivel");
  await expect(ventana).toBeHidden();

  // Tocar el 5 abre su ventana: título, estrellas, objetivo, umbrales, «Repetir» y «Cerrar».
  await page.locator("#nivel-5").click();
  await expect(ventana).toBeVisible();
  await expect(page.locator("#ficha-nivel-titulo")).toHaveText("Nivel 5");
  await expect(page.locator("#ficha-nivel-objetivo")).not.toBeEmpty();
  await expect(page.locator("#ficha-nivel-estrellas svg.estrella.llena")).toHaveCount(3);
  await expect(page.locator("#ficha-nivel-jugar")).toHaveAccessibleName("Repetir el nivel 5");
  await expect(page.locator("#ficha-nivel-jugar")).toBeFocused();
  // Escape cierra solo la ventana: el mapa sigue y el foco vuelve a la pegatina.
  await page.keyboard.press("Escape");
  await expect(ventana).toBeHidden();
  await expect(juego(page)).toHaveAttribute("data-estado", "niveles");

  // El 8, sin completar: sus umbrales de estrellas y «Jugar»; «Cerrar» la cierra.
  await page.locator("#nivel-8").click();
  await expect(ventana).toBeVisible();
  await expect(page.locator("#ficha-nivel-titulo")).toHaveText("Nivel 8");
  await expect(page.locator("#ficha-nivel-detalle")).toHaveText(/^2 estrellas: [\d.]+ puntos · 3: [\d.]+$/);
  await expect(page.locator("#ficha-nivel-jugar")).toHaveAccessibleName("Jugar el nivel 8");
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(ventana).toBeHidden();
  await expect(juego(page)).toHaveAttribute("data-estado", "niveles");

  // Con candado, el 9 y el 10 no responden ni a un clic forzado.
  for (const n of [9, 10]) {
    await expect(page.locator(`#nivel-${n}`)).toBeDisabled();
    await page.locator(`#nivel-${n}`).click({ force: true });
    await expect(ventana).toBeHidden();
    await expect(juego(page)).toHaveAttribute("data-estado", "niveles");
  }

  // «Jugar nivel 8»: un solo clic y empieza el 8.
  await page.getByRole("button", { name: "Jugar nivel 8", exact: true }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(juego(page)).toHaveAttribute("data-modo", "nivel");
  await expect(juego(page)).toHaveAttribute("data-nivel", "8");
  expect(vigilancia.errores).toEqual([]);
});

test("«Jugar» en la ventana de un nivel ya superado lo repite (F1)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo DOM: basta con escritorio (R17)");
  await sembrarProgreso(page, { niveles: { 1: 3, 2: 3, 3: 2 } });
  await preparar(page);
  await page.goto("/");
  await abrirNiveles(page);
  await page.locator("#nivel-2").click();
  await page.getByRole("button", { name: "Repetir el nivel 2" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(juego(page)).toHaveAttribute("data-nivel", "2");
});
