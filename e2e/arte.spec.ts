// Bloque A: fuente local, efectos, sonido, háptica e interfaz.
import { expect, test, type Page } from "@playwright/test";
import { conTactil, esperarFinListo, esperarLibre, jugarHastaElFin, preparar } from "./ayudas.ts";

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
          if (el.dataset.fase === "apuntando" && (borde ? Math.abs(x) >= 2.6 : d >= desde && d <= hasta)) {
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
  // Una caída (con el centro a más de 2,6 m, cae seguro; quedan 2 vidas), 6 perfectos (vida extra en el quinto), un bueno y normales.
  await soltarA(page, 0, 0, true);
  for (let i = 0; i < 6; i++) await soltarA(page, 0, 0.05);
  // Con el equipo cargado, una ventana estrecha puede saltarse y la pieza cae en otro sitio: se reintenta.
  for (let intento = 0; intento < 14; intento++) {
    const c = await contadores(page);
    if (!c.caida) await soltarA(page, 0, 0, true);
    else if (!c["colocada-bueno"]) await soltarA(page, 0.22, 0.3);
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

/** Envuelve `AudioContext` antes de cargar: cuenta contextos, su estado y los nodos creados. */
function espiarAudio(page: Page) {
  return page.addInitScript(() => {
    const espia = { contextos: [] as AudioContext[], nodos: 0 };
    (window as unknown as { __audio: typeof espia }).__audio = espia;
    const Original = window.AudioContext;
    class Espia extends Original {
      constructor(opciones?: AudioContextOptions) {
        super(opciones);
        espia.contextos.push(this);
      }
    }
    for (const metodo of ["createOscillator", "createGain", "createBufferSource", "createBiquadFilter", "createBuffer"] as const) {
      const original = Original.prototype[metodo] as (...args: unknown[]) => unknown;
      (Original.prototype as unknown as Record<string, unknown>)[metodo] = function (this: AudioContext, ...args: unknown[]) {
        espia.nodos++;
        return original.apply(this, args);
      };
    }
    window.AudioContext = Espia;
  });
}

const audio = (page: Page) =>
  page.evaluate(() => {
    const espia = (window as unknown as { __audio: { contextos: AudioContext[]; nodos: number } }).__audio;
    return { contextos: espia.contextos.length, sonando: espia.contextos.filter((c) => c.state === "running").length, nodos: espia.nodos };
  });

test("antes del primer gesto no hay ningún AudioContext sonando; tras el primer toque, sí (A4)", async ({ page }) => {
  await espiarAudio(page);
  const { errores } = await preparar(page, undefined, { audioReal: true });
  await page.goto("/");
  await esperarLibre(page);
  await page.waitForTimeout(500);
  expect((await audio(page)).sonando).toBe(0);
  await soltarA(page, 0, 0.05);
  await expect.poll(async () => (await audio(page)).nodos).toBeGreaterThan(1);
  expect(errores).toEqual([]);
});

test("con el sonido apagado no se crea ningún nodo de audio al soltar piezas (A4)", async ({ page }, testInfo) => {
  await espiarAudio(page);
  const { errores } = await preparar(page, undefined, { audioReal: true });
  await page.goto("/");
  await esperarLibre(page);
  const boton = page.getByRole("button", { name: "Sonido" });
  if (testInfo.project.use.hasTouch) await boton.tap();
  else await boton.click();
  await expect(boton).toHaveAttribute("aria-pressed", "false");
  const antes = (await audio(page)).nodos;
  for (let i = 0; i < 3; i++) await soltarA(page, 0, 0.05);
  await soltarA(page, 0, 0, true);
  await page.waitForTimeout(800);
  expect((await audio(page)).nodos).toBe(antes);
  expect(errores).toEqual([]);
});

/** Sustituye `navigator.vibrate` por un espía (o lo quita con `quitar`). */
function espiarVibracion(page: Page, quitar = false) {
  return page.addInitScript((sin) => {
    const llamadas: unknown[] = [];
    (window as unknown as { __vibraciones: unknown[] }).__vibraciones = llamadas;
    if (sin) {
      delete (Navigator.prototype as { vibrate?: unknown }).vibrate;
      return;
    }
    Object.defineProperty(Navigator.prototype, "vibrate", {
      configurable: true,
      value: (patron: unknown) => {
        llamadas.push(patron);
        return true;
      },
    });
  }, quitar);
}

const vibraciones = (page: Page) => page.evaluate(() => (window as unknown as { __vibraciones: unknown[] }).__vibraciones);

test("un perfecto vibra con 15 ms; con la vibración apagada no vibra (A4)", async ({ page }) => {
  await espiarVibracion(page);
  const { errores } = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await soltarA(page, 0, 0.05);
  await expect.poll(() => vibraciones(page)).toContain(15);
  const boton = page.getByRole("button", { name: "Vibración" });
  await boton.dispatchEvent("click");
  await expect(boton).toHaveAttribute("aria-pressed", "false");
  const antes = (await vibraciones(page)).length;
  for (let i = 0; i < 2; i++) await soltarA(page, 0, 0.05);
  await soltarA(page, 0, 0, true);
  await page.waitForTimeout(800);
  expect((await vibraciones(page)).length).toBe(antes);
  expect(errores).toEqual([]);
});

test("sin navigator.vibrate no hay error y no se ofrece el botón de vibración (A4)", async ({ page }) => {
  await espiarVibracion(page, true);
  const { errores } = await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await expect(page.getByRole("button", { name: "Vibración" })).toBeHidden();
  await soltarA(page, 0, 0.05);
  await soltarA(page, 0, 0, true);
  await page.waitForTimeout(800);
  expect(errores).toEqual([]);
});

/** Botones visibles de la página: id, tamaño y si están dentro de la ventana. */
const botonesVisibles = (page: Page) =>
  page.locator("button:visible").evaluateAll((botones) =>
    botones.map((b) => {
      const { width, height } = b.getBoundingClientRect();
      return { id: b.id, ancho: width, alto: height };
    }),
  );

test("en 1280×800 la columna de juego mide al menos 400 px y el escenario ocupa todo el ancho (A5)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Medida de escritorio");
  await page.setViewportSize({ width: 1280, height: 800 });
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const hud = await page.locator("#hud").boundingBox();
  expect(hud!.width).toBeGreaterThanOrEqual(400);
  expect(hud!.width).toBeCloseTo(800 * 0.5625, 0);
  const lienzo = await page.locator("#lienzo").boundingBox();
  expect(lienzo!.width).toBe(1280);
});

test("todos los botones visibles miden al menos 44×44 px, jugando, en el fin, en el reto de un amigo, en Retos, en Niveles y en Colección (A5, E3)", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  const comprobar = async (pantalla: string) => {
    const botones = await botonesVisibles(page);
    expect(botones.length, pantalla).toBeGreaterThan(0);
    for (const b of botones) {
      expect(b.ancho, `${pantalla} #${b.id}`).toBeGreaterThanOrEqual(44);
      expect(b.alto, `${pantalla} #${b.id}`).toBeGreaterThanOrEqual(44);
    }
  };
  await comprobar("jugando");
  await jugarHastaElFin(page, conTactil(testInfo));
  await comprobar("fin");
  await page.goto("/?reto=1.5");
  await expect(page.locator("#juego")).toHaveAttribute("data-estado", "reto");
  await comprobar("reto");
  await page.getByRole("button", { name: /^Retos/ }).click();
  await expect(page.locator("#juego")).toHaveAttribute("data-estado", "retos");
  await comprobar("retos");
  await page.getByRole("button", { name: /^Niveles/ }).click();
  await expect(page.locator("#juego")).toHaveAttribute("data-estado", "niveles");
  await comprobar("niveles");
  await page.getByRole("button", { name: /^Colección/ }).click();
  await expect(page.locator("#juego")).toHaveAttribute("data-estado", "coleccion");
  await comprobar("coleccion");
});

test("con el teclado, Tab llega a todos los botones visibles y el foco se ve (A5)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Teclado: solo en escritorio");
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await jugarHastaElFin(page, false);
  await esperarFinListo(page);
  const esperados = (await botonesVisibles(page)).map((b) => b.id).sort();
  const vistos = new Set<string>();
  for (let i = 0; i < esperados.length + 3; i++) {
    await page.keyboard.press("Tab");
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el.tagName !== "BUTTON") return null;
      const estilo = getComputedStyle(el);
      return { id: el.id, visible: el.matches(":focus-visible") && estilo.outlineStyle !== "none" && parseFloat(estilo.outlineWidth) >= 2 };
    });
    if (!foco) continue;
    expect(foco.visible, `foco visible en #${foco.id}`).toBe(true);
    vistos.add(foco.id);
  }
  expect([...vistos].sort()).toEqual(esperados);
});
