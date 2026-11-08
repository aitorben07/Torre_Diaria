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

    const contador = (tipo: string) =>
      page.evaluate((t) => (JSON.parse(document.getElementById("juego")!.dataset.efectos ?? "{}") as Record<string, number>)[t] ?? 0, tipo);
    const esperarEfecto = async (tipo: string, antes: number) => {
      await page.waitForFunction(
        ([t, n]) => ((JSON.parse(document.getElementById("juego")!.dataset.efectos ?? "{}") as Record<string, number>)[t as string] ?? 0) > (n as number),
        [tipo, antes] as const,
      );
    };
    for (let i = 0; i < 11; i++) {
      await soltarCentrada(page);
      const antes = await contador("aterrizaje");
      if (i === 4) {
        await esperarEfecto("aterrizaje", antes);
        await page.waitForTimeout(110);
        await guardar("3-perfecto");
      }
    }
    await page.waitForFunction(() => document.getElementById("juego")!.dataset.fase === "apuntando");
    await page.waitForTimeout(400);
    await guardar("2-mitad");

    const chapuzones = await contador("chapuzon");
    await soltarEnExtremo(page);
    await esperarEfecto("chapuzon", chapuzones);
    await page.waitForTimeout(90);
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

/** Progreso sembrado para las capturas de C y D: monedas, Madera comprada, racha 2 y días con medallas. */
function progresoDeMuestra(escenario: string, mejorRacha: number) {
  const dia = (puntos: number, enSuDia: boolean, reglas = 2) => ({ puntos, piezas: 30, altura: 12.3, perfectos: 9, colocadas: "0-29", enSuDia, reglas });
  return {
    version: 2,
    monedas: 1240,
    catalogo: { comprados: ["madera"], equipado: { tema: "riso", escenario } },
    libre: { record: 2310, alturaRecord: 7.5, partidas: 12 },
    diarios: { 9: dia(4100, true), 10: dia(2500, true), 11: dia(300, true), 12: dia(700, false), 14: dia(0, true, 1), 15: dia(1200, true) },
    racha: { actual: 2, mejor: mejorRacha, ultimoDia: 15, congeladores: 1 },
    niveles: {},
    ajustes: { sonido: true, vibracion: true, tutorialVisto: true },
    estadisticas: { piezas: 400, perfectos: 120, comboMax: 9, alturaMax: 18.5 },
    ultimaCobrada: "",
  };
}

for (const [nombre, ancho, alto] of [
  ["movil", 390, 844],
  ["escritorio", 1280, 800],
] as const) {
  test(`capturas de C y D ${nombre} ${ancho}x${alto}`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "Una vez basta");
    test.setTimeout(240_000);
    mkdirSync(CARPETA, { recursive: true });
    const contexto = await browser.newContext({
      viewport: { width: ancho, height: alto },
      deviceScaleFactor: nombre === "movil" ? 2 : 1,
      hasTouch: nombre === "movil",
    });
    const guardarEn = (page: Page, paso: string) => page.screenshot({ path: fileURLToPath(new URL(`${nombre}-${paso}.png`, CARPETA)) });
    const abrirCon = async (escenario: string, mejorRacha: number) => {
      const page = await contexto.newPage();
      await page.addInitScript((valor) => localStorage.setItem("torre-diaria:progreso", valor), JSON.stringify(progresoDeMuestra(escenario, mejorRacha)));
      await preparar(page);
      await page.goto("/");
      await esperarLibre(page);
      await page.evaluate(() => document.fonts.ready);
      return page;
    };

    // Colección: pestaña de piezas y de escenarios.
    let page = await abrirCon("puerto", 2);
    await page.getByRole("button", { name: /^Colección/ }).click();
    await page.waitForTimeout(400);
    await guardarEn(page, "6-coleccion-piezas");
    await page.getByRole("tab", { name: "Escenarios" }).click();
    await page.waitForTimeout(300);
    await guardarEn(page, "7-coleccion-escenarios");
    await page.getByRole("button", { name: "Cerrar" }).first().click();

    // Retos: calendario con medallas, racha y congeladores.
    await page.getByRole("button", { name: /^Retos/ }).click();
    await page.waitForTimeout(300);
    await guardarEn(page, "8-retos");

    // Desbloqueo: el reto de hoy lleva la racha a 3 y desbloquea la Ciudad.
    await page.getByRole("button", { name: "Jugar el reto de hoy" }).click();
    await expect(juego(page)).toHaveAttribute("data-modo", "oficial");
    while ((await juego(page).getAttribute("data-estado")) !== "fin") {
      await soltarEnExtremo(page).catch(() => undefined);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1200);
    await guardarEn(page, "9-desbloqueo");
    await page.close();

    // Partidas en Ciudad y en Nubes, con la torre a media altura.
    for (const [escenario, paso] of [
      ["ciudad", "10-ciudad"],
      ["nubes", "11-nubes"],
    ] as const) {
      page = await abrirCon(escenario, 7);
      for (let i = 0; i < 9; i++) await soltarCentrada(page);
      await page.waitForFunction(() => document.getElementById("juego")!.dataset.fase === "apuntando");
      await page.waitForTimeout(400);
      await guardarEn(page, paso);
      await page.close();
    }
    await contexto.close();
  });
}
