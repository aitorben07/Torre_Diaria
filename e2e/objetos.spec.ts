// I3 de la tercera versión: barra de objetos (reloj y cemento) en la partida,
// «¿Seguir?» solo en la libre (impacto R-4) y aviso del objeto nuevo en el fin.
// Se espera siempre a atributos o contadores (`data-velocidad`, `data-estado`,
// `data-vidas`), nunca a un tiempo fijo. Lo que es solo DOM va en escritorio (R17).
import { expect, test, type Page } from "@playwright/test";
import { RELOJ_MULT } from "../src/logica/ritmo.ts";
import { jugar } from "../src/logica/simulacion.ts";
import { conTactil, datosFin, DIA, empezarHoy, esperarFinListo, esperarLibre, juego, jugarHastaElFin, jugarLibre, leerProgreso, preparar, pulsarEnSeguir, sembrarProgreso, soltarEnExtremo } from "./ayudas.ts";

const TODOS = ["reloj", "cemento", "corazon"];

/** Progreso v3 con objetos desbloqueados y las unidades dadas. */
function conObjetos(objetos: { reloj?: number; cemento?: number; corazon?: number }, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 3,
    estadisticas: { piezas: 0, perfectos: 0, comboMax: 0, alturaMax: 0, partidas: 6 },
    objetos: { reloj: 0, cemento: 0, corazon: 0, ...objetos, desbloqueados: TODOS },
    ...extra,
  };
}

const velocidad = async (page: Page) => Number(await juego(page).getAttribute("data-velocidad"));

/** Espera a que cuelgue una pieza. */
const apuntando = (page: Page) => page.waitForFunction(() => document.getElementById("juego")!.dataset.fase === "apuntando");

/** Suelta piezas en el extremo hasta que aparece «¿Seguir?» o el fin; devuelve cuál. */
async function perderHasta(page: Page): Promise<"seguir" | "fin"> {
  for (let i = 0; i < 20; i++) {
    const estado = await juego(page).getAttribute("data-estado");
    if (estado === "seguir" || estado === "fin") return estado;
    await soltarEnExtremo(page);
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado !== "jugando" || el.dataset.fase === "apuntando";
    });
  }
  throw new Error("La partida no ha acabado");
}

test("con 1 reloj, tocarlo con la pieza colgando deja 0, baja la velocidad a ×RELOJ_MULT y se guarda (I3)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, conObjetos({ reloj: 1 }));
  await page.goto("/");
  await jugarLibre(page);
  const reloj = page.locator("#objeto-reloj");
  await expect(page.locator("#barra-objetos")).toBeVisible();
  await expect(reloj).toHaveAttribute("data-cuantos", "1");
  await apuntando(page);
  await expect(reloj).toBeEnabled();
  const antes = await velocidad(page);
  expect(antes).toBeGreaterThan(0);
  await reloj.click();
  await expect(reloj).toHaveAttribute("data-cuantos", "0");
  await expect(reloj.locator(".cuenta")).toHaveText("+");
  // La velocidad se redondea a centésimas después de los multiplicadores (impacto, B1).
  await expect.poll(() => velocidad(page)).toBeCloseTo(antes * RELOJ_MULT, 1);
  expect(Math.abs((await velocidad(page)) - antes * RELOJ_MULT)).toBeLessThanOrEqual(0.011);
  expect((await leerProgreso(page))?.objetos.reloj).toBe(0);
  // Sin foco en el botón: el teclado sigue soltando la pieza.
  await expect(reloj).not.toBeFocused();
  expect(vigilancia.errores).toEqual([]);
});

test("con 0 unidades, «+» abre la Tienda en Objetos encima de la partida y al cerrar sigue (I3, J1, impacto R-6)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo DOM: basta con escritorio (R17)");
  await preparar(page);
  await sembrarProgreso(page, conObjetos({}));
  await page.goto("/");
  await jugarLibre(page);
  await page.locator("#objeto-cemento").click();
  await expect(juego(page)).toHaveAttribute("data-estado", "tienda");
  await expect(juego(page)).toHaveAttribute("data-debajo", "jugando");
  await expect(page.getByRole("tab", { name: "Objetos" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await esperarLibre(page);
});

test("los botones de la barra solo están activos con la pieza colgando, y la barra no se ve sin objetos desbloqueados (I3)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo DOM: basta con escritorio (R17)");
  await preparar(page);
  await sembrarProgreso(page, conObjetos({ reloj: 2, cemento: 2 }));
  await page.goto("/");
  await jugarLibre(page);
  await apuntando(page);
  await expect(page.locator("#objeto-cemento")).toBeEnabled();
  await soltarEnExtremo(page);
  await expect(page.locator("#objeto-cemento")).toBeDisabled();
  await apuntando(page);
  await expect(page.locator("#objeto-cemento")).toBeEnabled();
  // Un progreso sin nada desbloqueado: sin barra.
  await page.evaluate(() => localStorage.removeItem("torre-diaria:progreso"));
  await page.goto("/");
  await jugarLibre(page);
  await apuntando(page);
  await expect(page.locator("#barra-objetos")).toBeHidden();
});

test("en el reto oficial y en su repetición no hay barra ni «¿Seguir?» (R13)", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await preparar(page);
  await sembrarProgreso(page, conObjetos({ reloj: 3, cemento: 3, corazon: 3 }, { monedas: 5000 }));
  await page.goto("/");
  await empezarHoy(page);
  await apuntando(page);
  await expect(page.locator("#barra-objetos")).toBeHidden();
  await jugarHastaElFin(page, conTactil(testInfo), { sinSeguir: true });
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  // La repetición del día, desde el enlace del reto.
  await page.goto(`/?reto=${DIA}.5`);
  await page.locator("#boton-repetir-reto").click();
  await expect(juego(page)).toHaveAttribute("data-modo", "repeticion");
  await apuntando(page);
  await expect(page.locator("#barra-objetos")).toBeHidden();
  await jugarHastaElFin(page, conTactil(testInfo), { sinSeguir: true });
  expect((await leerProgreso(page))?.objetos.corazon).toBe(3);
});

test("sin corazones, con 0 monedas, sin vídeo y en la libre con récord, al perder no aparece «¿Seguir?» (I3)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Basta con escritorio (R17)");
  await preparar(page);
  await sembrarProgreso(page, conObjetos({}, { monedas: 0, libre: { record: 1, alturaRecord: 1, partidas: 6 } }));
  await page.goto("/");
  await jugarLibre(page);
  expect(await perderHasta(page)).toBe("fin");
});

test("en un nivel no se ofrece «¿Seguir?» aunque haya corazones (impacto R-4)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Basta con escritorio (R17)");
  await preparar(page);
  await sembrarProgreso(page, conObjetos({ corazon: 3 }, { monedas: 5000, niveles: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } }));
  await page.goto("/");
  await page.getByRole("button", { name: /^Niveles/ }).click();
  await page.getByRole("button", { name: "Jugar nivel 7", exact: true }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "nivel");
  await expect(page.locator("#barra-objetos")).toBeVisible();
  expect(await perderHasta(page)).toBe("fin");
});

test("con un corazón y un reloj: «Usar corazón» sigue con 1 vida, al volver a perder ya no se ofrece, y la partida equivale a jugar() en Node (I3, R3)", async ({ page }) => {
  test.setTimeout(120_000);
  const vigilancia = await preparar(page);
  await sembrarProgreso(page, conObjetos({ reloj: 1, corazon: 1 }, { monedas: 0 }));
  await page.goto("/");
  await jugarLibre(page);
  await apuntando(page);
  await page.locator("#objeto-reloj").click();
  await expect(page.locator("#objeto-reloj")).toHaveAttribute("data-cuantos", "0");
  expect(await perderHasta(page)).toBe("seguir");
  await expect(page.locator("#seguir")).toBeVisible();
  await expect(page.locator("#seguir-monedas")).toBeHidden();
  await expect(page.locator("#seguir-video")).toBeHidden();
  // El foco, en el título: no en un botón de pago.
  await expect(page.locator("#seguir-titulo")).toBeFocused();
  await pulsarEnSeguir(page, page.getByRole("button", { name: "Usar corazón (tienes 1)" }));
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(juego(page)).toHaveAttribute("data-vidas", "1");
  expect((await leerProgreso(page))?.objetos.corazon).toBe(0);
  // Otra vez sin vidas: directo al fin.
  expect(await perderHasta(page)).toBe("fin");

  const fin = await datosFin(page);
  expect(fin.ayudas.map((a) => a.tipo)).toEqual(["reloj", "seguir"]);
  const enNode = jugar(fin.semilla, fin.toques, { ...fin.opciones, ayudas: fin.ayudas });
  expect(enNode.terminada).toBe(true);
  expect(enNode.puntos).toBe(fin.puntos);
  expect(enNode.altura).toBeCloseTo(fin.altura, 9);
  expect(vigilancia.errores).toEqual([]);
});

test("un toque justo al aparecer «¿Seguir?», Espacio e Intro no gastan ni el corazón ni las monedas (I3, impacto 2.5)", async ({ page }) => {
  test.setTimeout(120_000);
  await preparar(page);
  await sembrarProgreso(page, conObjetos({ corazon: 1 }, { monedas: 600 }));
  await page.goto("/");
  await jugarLibre(page);
  // El toque, dentro de la página y en el mismo cambio de `data-estado`: llega
  // a los 0 ms aunque el equipo vaya cargado. Se pulsan todos los botones.
  await page.evaluate(() => {
    const el = document.getElementById("juego")!;
    const vigia = new MutationObserver(() => {
      if (el.dataset.estado !== "seguir") return;
      vigia.disconnect();
      for (const id of ["seguir-corazon", "seguir-monedas", "seguir-no"]) document.getElementById(id)!.click();
    });
    vigia.observe(el, { attributes: true, attributeFilter: ["data-estado"] });
  });
  expect(await perderHasta(page)).toBe("seguir");
  // El foco está en el título: Espacio e Intro no pulsan ningún botón de pago, lleguen cuando lleguen.
  await expect(page.locator("#seguir-titulo")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(juego(page)).toHaveAttribute("data-estado", "seguir");
  const p = await leerProgreso(page);
  expect(p?.objetos.corazon).toBe(1);
  expect(p?.monedas).toBe(600);
  // Pasada la espera, el mismo botón sí sigue.
  await pulsarEnSeguir(page, page.locator("#seguir-corazon"));
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  expect((await leerProgreso(page))?.objetos.corazon).toBe(0);
});

test("con monedas, «250 monedas» sigue y las resta; «No, ver resultado» lleva al fin sin gastar nada (I3)", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(conTactil(testInfo), "Basta con escritorio (R17)");
  await preparar(page);
  await sembrarProgreso(page, conObjetos({ corazon: 1 }, { monedas: 600 }));
  await page.goto("/");
  await jugarLibre(page);
  expect(await perderHasta(page)).toBe("seguir");
  await expect(page.locator("#seguir-corazon")).toBeVisible();
  await pulsarEnSeguir(page, page.getByRole("button", { name: "No, ver resultado" }));
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  let p = await leerProgreso(page);
  expect(p?.objetos.corazon).toBe(1);
  // Las monedas solo suben con lo ganado en la partida.
  expect(p?.monedas).toBeGreaterThanOrEqual(600);

  // Otra partida: ahora se paga con monedas.
  const monedas = p!.monedas;
  await page.reload();
  await jugarLibre(page);
  expect(await perderHasta(page)).toBe("seguir");
  await pulsarEnSeguir(page, page.getByRole("button", { name: "250 monedas" }));
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  p = await leerProgreso(page);
  expect(p?.monedas).toBe(monedas - 250);
  expect(p?.objetos.corazon).toBe(1);
});

test("al desbloquear un objeto, el fin lo avisa con su regalo y la siguiente partida tiene la barra (I3)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Basta con escritorio (R17)");
  await preparar(page);
  await sembrarProgreso(page, { version: 3, estadisticas: { piezas: 0, perfectos: 0, comboMax: 0, alturaMax: 0, partidas: 1 } });
  await page.goto("/");
  await jugarLibre(page);
  await expect(page.locator("#barra-objetos")).toBeHidden();
  await jugarHastaElFin(page, false);
  await expect(page.locator("#fin-objeto")).toHaveText("Nuevo objeto: Reloj de arena. Te regalamos 2.");
  await esperarFinListo(page);
  await page.locator("#boton-otra-vez").click();
  await esperarLibre(page);
  await expect(page.locator("#objeto-reloj")).toHaveAttribute("data-cuantos", "2");
  await expect(page.locator("#objeto-cemento")).toBeHidden();
});

test("en 320×568 la barra de objetos no tapa el muelle: su cara y su frente quedan por encima (I3)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Basta con escritorio (R17)");
  await page.setViewportSize({ width: 320, height: 568 });
  await preparar(page);
  await sembrarProgreso(page, conObjetos({ reloj: 2, cemento: 1 }));
  await page.goto("/");
  await jugarLibre(page);
  const barra = page.locator("#barra-objetos");
  await expect(barra).toBeVisible();
  const arribaBarra = (await barra.boundingBox())!.y;
  // Frente del muelle: 0,44 m, unos 15 px con 34,8 px por metro (320 px / 9,2 m).
  const frente = 0.44 * (320 / 9.2);
  // `data-muelle`: fila CSS de la cara del muelle; la cámara sube poco a poco. Sin el atributo, NaN: no pasa.
  const muelle = async () => Number((await page.locator("#lienzo").getAttribute("data-muelle")) ?? Number.NaN);
  await expect.poll(async () => (await muelle()) + frente).toBeLessThanOrEqual(arribaBarra);
});
