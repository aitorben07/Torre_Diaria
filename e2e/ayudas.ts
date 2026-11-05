import { expect, test, type Page, type TestInfo } from "@playwright/test";

/** Fecha fijada en las pruebas: el día 16 (`2026-11-20`). */
export const FECHA = "2026-11-20T12:00:00Z";
export const DIA = 16;
export const SEMILLA = "2026-11-20";

export type Vigilancia = { errores: string[]; ajenas: string[] };

/**
 * Fija la fecha (sin falsear los temporizadores, para que la animación siga) y
 * recoge errores de consola, excepciones y peticiones a otros orígenes.
 */
export async function preparar(page: Page, fecha: string = FECHA): Promise<Vigilancia> {
  await page.clock.setFixedTime(new Date(fecha));
  const vigilancia: Vigilancia = { errores: [], ajenas: [] };
  page.on("console", (mensaje) => {
    if (mensaje.type() === "error") vigilancia.errores.push(mensaje.text());
  });
  page.on("pageerror", (error) => vigilancia.errores.push(error.message));
  const propio = new URL(test.info().project.use.baseURL!).origin;
  page.on("request", (peticion) => {
    const url = new URL(peticion.url());
    if (url.protocol !== "data:" && url.origin !== propio) vigilancia.ajenas.push(peticion.url());
  });
  return vigilancia;
}

export function conTactil(testInfo: TestInfo): boolean {
  return testInfo.project.use.hasTouch === true;
}

/** Un toque sobre el lienzo (pantalla táctil) o un clic (escritorio). */
export async function tocar(page: Page, tactil: boolean): Promise<void> {
  const lienzo = page.locator("#lienzo");
  // Sin esperar a que sea «estable»: la partida puede acabar justo antes del toque.
  if (tactil) await lienzo.tap({ force: true });
  else await lienzo.click({ force: true });
}

export const juego = (page: Page) => page.locator("#juego");

export async function empezarHoy(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Jugar el reto de hoy/ }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
}

/**
 * Toca cada pieza hasta que acaba la partida. Las `centradas` primeras se
 * tocan cuando pasan cerca del centro (`data-x`); las `conRetraso` siguientes,
 * `retrasoMs` después de aparecer; las demás, en cuanto aparecen.
 */
export async function jugarHastaElFin(
  page: Page,
  tactil: boolean,
  { centradas = 0, conRetraso = 0, retrasoMs = 0 }: { centradas?: number; conRetraso?: number; retrasoMs?: number } = {},
): Promise<void> {
  const contenedor = juego(page);
  for (let pieza = 0; pieza < 200; pieza++) {
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
    });
    if ((await contenedor.getAttribute("data-estado")) === "fin") return;
    if (pieza < centradas) {
      // Dentro de la página, en el mismo fotograma en que la pieza pasa por el
      // centro: un toque desde Playwright llega cientos de ms tarde con carga.
      await page.evaluate(
        () =>
          new Promise<void>((listo) => {
            const mirar = () => {
              const el = document.getElementById("juego")!;
              if (el.dataset.estado === "fin") return listo();
              if (Math.abs(Number(el.dataset.x || "9")) <= 0.15) {
                document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
                return listo();
              }
              requestAnimationFrame(mirar);
            };
            mirar();
          }),
      );
    } else {
      if (pieza < centradas + conRetraso) await page.waitForTimeout(retrasoMs);
      await tocar(page, tactil);
    }
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado === "fin" || el.dataset.fase !== "apuntando";
    });
  }
  throw new Error("La partida no ha terminado en 200 piezas");
}

export async function datosFin(page: Page): Promise<{ toques: number[]; puntos: number; altura: number; semilla: string }> {
  const contenedor = juego(page);
  await expect(contenedor).toHaveAttribute("data-estado", "fin");
  return {
    toques: JSON.parse((await contenedor.getAttribute("data-toques")) ?? "null") as number[],
    puntos: Number(await contenedor.getAttribute("data-puntos")),
    altura: Number(await contenedor.getAttribute("data-altura")),
    semilla: (await contenedor.getAttribute("data-semilla")) ?? "",
  };
}
