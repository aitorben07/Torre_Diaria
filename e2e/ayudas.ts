import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { Progreso } from "../src/logica/progreso.ts";
import type { Ayuda, OpcionesPartida } from "../src/logica/simulacion.ts";

/** Fecha fijada en las pruebas: el día 16 (`2026-11-20`). */
export const FECHA = "2026-11-20T12:00:00Z";
export const DIA = 16;
export const SEMILLA = "2026-11-20";

export type Vigilancia = { errores: string[]; ajenas: string[] };

/**
 * Fija la fecha (sin falsear los temporizadores, para que la animación siga) y
 * recoge errores de consola, excepciones y peticiones a otros orígenes.
 *
 * Salvo con `audioReal`, cambia `AudioContext` por uno mudo que nunca llega a
 * sonar: abrir el dispositivo de audio de verdad tarda de 0,4 a 6 s en algunos
 * equipos Windows y bloquea la página, y estas pruebas no prueban el sonido
 * (las de A4, en `arte.spec.ts`, usan el real).
 */
export async function preparar(page: Page, fecha: string = FECHA, { audioReal = false }: { audioReal?: boolean } = {}): Promise<Vigilancia> {
  await page.clock.setFixedTime(new Date(fecha));
  if (!audioReal) {
    await page.addInitScript(() => {
      const nodo = () => ({ gain: { value: 1 }, connect: () => nodo() });
      class AudioContextMudo {
        state = "suspended";
        currentTime = 0;
        sampleRate = 44100;
        destination = {};
        createGain = nodo;
        resume = () => Promise.resolve();
        suspend = () => Promise.resolve();
        close = () => Promise.resolve();
      }
      (window as unknown as { AudioContext: unknown }).AudioContext = AudioContextMudo;
    });
  }
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

/** La partida libre está en marcha (tras «Jugar», «Otra vez» o el enlace de un amigo). */
export async function esperarLibre(page: Page): Promise<void> {
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(juego(page)).toHaveAttribute("data-modo", "libre");
}

/** Espera la pantalla de inicio, que se ve siempre al abrir `/` sin enlaces (E2). */
export async function esperarInicio(page: Page): Promise<void> {
  await expect(juego(page)).toHaveAttribute("data-estado", "inicio");
}

/** Desde el inicio, «Jugar» y la partida libre en marcha (E4). */
export async function jugarLibre(page: Page): Promise<void> {
  await esperarInicio(page);
  await page.locator("#inicio-jugar").click();
  await esperarLibre(page);
}

/** Desde el fin (pasados los 700 ms) o la pausa, «Inicio» y la pantalla de inicio (E3). */
export async function irAlInicio(page: Page): Promise<void> {
  const estado = await juego(page).getAttribute("data-estado");
  if (estado === "fin") await esperarFinListo(page);
  await page.locator(estado === "pausa" ? "#pausa-inicio" : "#boton-inicio").click();
  await esperarInicio(page);
}

/** Pausa la partida con su botón del HUD (E3). */
export async function pausar(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Pausa", exact: true }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "pausa");
}

/** Abre Retos desde la tarjeta «Reto de hoy» del inicio (E4). */
export async function abrirRetos(page: Page): Promise<void> {
  await esperarInicio(page);
  await page.getByRole("button", { name: /^Reto de hoy/ }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "retos");
}

/** Abre Niveles desde su tarjeta del inicio (E4). */
export async function abrirNiveles(page: Page): Promise<void> {
  await esperarInicio(page);
  await page.getByRole("button", { name: /^Niveles/ }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "niveles");
}

/** Abre Colección desde su tarjeta del inicio (E4). */
export async function abrirColeccion(page: Page): Promise<void> {
  await esperarInicio(page);
  await page.locator("#tarjeta-coleccion").click();
  await expect(juego(page)).toHaveAttribute("data-estado", "coleccion");
}

/** Abre Ajustes con la rueda del inicio (C2). */
export async function abrirAjustes(page: Page): Promise<void> {
  await esperarInicio(page);
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "ajustes");
}

/** Empieza el reto de hoy: la tarjeta «Reto de hoy» del inicio y «Jugar el reto de hoy» en la ficha de hoy. */
export async function empezarHoy(page: Page): Promise<void> {
  await abrirRetos(page);
  await page.getByRole("button", { name: "Jugar el reto de hoy" }).click();
  await expect(juego(page)).toHaveAttribute("data-modo", "oficial");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
}

export const CLAVE_PROGRESO = "torre-diaria:progreso";

/** Progreso guardado (C1) tal como está en `localStorage`, o `null`. */
export async function leerProgreso(page: Page): Promise<Progreso | null> {
  const texto = await page.evaluate((clave) => localStorage.getItem(clave), CLAVE_PROGRESO);
  return texto ? (JSON.parse(texto) as Progreso) : null;
}

/** Siembra el progreso antes de cargar la página (en cada carga, salvo `soloUnaVez`). */
export async function sembrarProgreso(page: Page, progreso: Record<string, unknown>, soloUnaVez = true): Promise<void> {
  await page.addInitScript(
    ([clave, valor, unaVez]) => {
      if (unaVez && sessionStorage.getItem("sembrado")) return;
      sessionStorage.setItem("sembrado", "1");
      localStorage.setItem(clave as string, valor as string);
    },
    [CLAVE_PROGRESO, JSON.stringify({ version: 2, ...progreso }), soloUnaVez] as const,
  );
}

/** Espera a que pasen los 700 ms en que la pantalla de fin ignora toques y teclas. */
export async function esperarFinListo(page: Page): Promise<void> {
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  await page.waitForTimeout(800);
}

/**
 * Toca cada pieza hasta que acaba la partida. Las `centradas` primeras se
 * tocan cuando pasan cerca del objetivo (`data-x` y `data-objetivo`); las
 * `conRetraso` siguientes, `retrasoMs` después de aparecer; las demás, en el
 * extremo (caen y cuestan una vida). Esas últimas se sueltan dentro de la
 * página, salvo con `real`, que usa un toque o clic de Playwright: con carga,
 * ese toque puede llegar tarde, la pieza ya no cae y la partida se alarga.
 */
export async function jugarHastaElFin(
  page: Page,
  tactil: boolean,
  {
    centradas = 0,
    conRetraso = 0,
    retrasoMs = 0,
    real = false,
  }: { centradas?: number; conRetraso?: number; retrasoMs?: number; real?: boolean } = {},
): Promise<void> {
  const contenedor = juego(page);
  for (let pieza = 0; pieza < 200; pieza++) {
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
    });
    if ((await contenedor.getAttribute("data-estado")) === "fin") return;
    const antes = await soltadas(page);
    if (pieza < centradas) {
      // Dentro de la página, en el mismo fotograma en que la pieza pasa por el
      // centro: un toque desde Playwright llega cientos de ms tarde con carga.
      await page.evaluate(
        () =>
          new Promise<void>((listo) => {
            const mirar = () => {
              const el = document.getElementById("juego")!;
              if (el.dataset.estado === "fin") return listo();
              if (Math.abs(Number(el.dataset.x || "9") - Number(el.dataset.objetivo || "0")) <= 0.15) {
                document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
                return listo();
              }
              requestAnimationFrame(mirar);
            };
            mirar();
          }),
      );
    } else if (pieza < centradas + conRetraso) {
      await page.waitForTimeout(retrasoMs);
      await tocar(page, tactil);
    } else if (real) {
      await tocar(page, tactil);
    } else {
      await soltarEnExtremo(page);
    }
    // Se espera a que la pieza cuente como soltada (contador de efectos), no a ver la
    // fase cambiar: con carga, la caída entera puede pasar antes de que Playwright mire.
    await page.waitForFunction(
      (n) => {
        const el = document.getElementById("juego")!;
        return el.dataset.estado === "fin" || ((JSON.parse(el.dataset.efectos ?? "{}") as { soltada?: number }).soltada ?? 0) > n;
      },
      antes,
    );
  }
  throw new Error("La partida no ha terminado en 200 piezas");
}

export type DatosFin = {
  toques: number[];
  puntos: number;
  altura: number;
  semilla: string;
  /** Opciones de la partida (`data-opciones`), para repetirla con `jugar` (G3). */
  opciones: OpcionesPartida;
  /** Objetos usados y «seguir», con su paso (`data-ayudas`, I1 y R3). */
  ayudas: Ayuda[];
};

export async function datosFin(page: Page): Promise<DatosFin> {
  const contenedor = juego(page);
  await expect(contenedor).toHaveAttribute("data-estado", "fin");
  return {
    toques: JSON.parse((await contenedor.getAttribute("data-toques")) ?? "null") as number[],
    puntos: Number(await contenedor.getAttribute("data-puntos")),
    altura: Number(await contenedor.getAttribute("data-altura")),
    semilla: (await contenedor.getAttribute("data-semilla")) ?? "",
    opciones: JSON.parse((await contenedor.getAttribute("data-opciones")) ?? "{}") as OpcionesPartida,
    ayudas: JSON.parse((await contenedor.getAttribute("data-ayudas")) ?? "null") as Ayuda[],
  };
}

/** Piezas soltadas en la partida en pantalla (contador de efectos de `data-efectos`). */
async function soltadas(page: Page): Promise<number> {
  return page.evaluate(() => (JSON.parse(document.getElementById("juego")!.dataset.efectos ?? "{}") as { soltada?: number }).soltada ?? 0);
}

/**
 * Suelta la pieza dentro de la página mientras sigue lejos de la plataforma
 * (con el centro a 2,2 m o más, así que cae: medido en impacto 2.1, 90 de 90
 * con las reglas 3). Un toque desde Playwright puede llegar cientos de ms
 * tarde con carga, y para entonces la pieza ya está sobre la torre. Con
 * `AMPLITUD` 2,6 m, el margen de 2,2 a 2,6 m deja unos 0,3 s por lado aunque
 * los fotogramas vayan lentos. Espera a que la pieza deje de colgar.
 */
export async function soltarEnExtremo(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const el = document.getElementById("juego")!;
    return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
  });
  await page.evaluate(
    () =>
      new Promise<void>((listo) => {
        const mirar = () => {
          const el = document.getElementById("juego")!;
          if (el.dataset.estado === "fin") return listo();
          if (soltadaEn !== null && el.dataset.fase !== "apuntando") return listo();
          // Por si el toque se perdiera: si 4 s después la pieza sigue colgando, se
          // vuelve a soltar cuando está lejos de la plataforma.
          const tocaSoltar = soltadaEn === null || performance.now() - soltadaEn > 4000;
          if (tocaSoltar && el.dataset.fase === "apuntando" && Math.abs(Number(el.dataset.x || "0")) >= 2.2) {
            document.getElementById("zona")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
            soltadaEn = performance.now();
          }
          requestAnimationFrame(mirar);
        };
        let soltadaEn: number | null = null;
        mirar();
      }),
  );
}
