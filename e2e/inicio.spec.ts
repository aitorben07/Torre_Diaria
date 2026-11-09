// E2, E3 y C2 (tercera versión): pantalla de inicio siempre al abrir, «Jugar»
// con Espacio e Intro sin soltar pieza, tarjetas del inicio, pausa en todos
// los modos y créditos de Ajustes. Lo que es solo DOM o maquetación va en
// escritorio (R17); la pausa y el inicio se prueban también en el móvil.
import { expect, test, type Page } from "@playwright/test";
import { abrirAjustes, conTactil, DIA, empezarHoy, esperarInicio, irAlInicio, juego, jugarHastaElFin, jugarLibre, pausar, preparar, sembrarProgreso } from "./ayudas.ts";

/** Piezas soltadas en la partida en pantalla (contador de `data-efectos`). */
const soltadas = (page: Page) => page.evaluate(() => (JSON.parse(document.getElementById("juego")!.dataset.efectos ?? "{}") as { soltada?: number }).soltada ?? 0);

/** Espera a que la partida haya dado al menos `n` pasos más que ahora. */
async function esperarPasos(page: Page, n: number): Promise<number> {
  const desde = Number((await juego(page).getAttribute("data-pasos")) ?? "0");
  await expect.poll(async () => Number((await juego(page).getAttribute("data-pasos")) ?? "0")).toBeGreaterThanOrEqual(desde + n);
  return Number(await juego(page).getAttribute("data-pasos"));
}

test("al abrir / se ve el inicio: no cae ninguna pieza, no hay marcador y «Jugar» tiene el foco (E2)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await page.goto("/");
  await esperarInicio(page);
  await expect(page.locator("#inicio")).toBeVisible();
  await expect(page.locator("#hud")).toBeHidden();
  await expect(page.locator("#inicio-jugar")).toBeFocused();
  await page.waitForTimeout(2000);
  // Sin partida no hay pasos ni piezas soltadas.
  await expect(juego(page)).not.toHaveAttribute("data-pasos", /./);
  await expect(juego(page)).toHaveAttribute("data-estado", "inicio");
  expect(await soltadas(page)).toBe(0);
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

for (const tecla of ["Space", "Enter"]) {
  test(`con el foco en «Jugar», ${tecla} empieza la partida una sola vez y no suelta ninguna pieza (E2)`, async ({ page }, testInfo) => {
    test.skip(conTactil(testInfo), "Teclado: solo en escritorio");
    await preparar(page);
    await page.goto("/");
    await esperarInicio(page);
    await expect(page.locator("#inicio-jugar")).toBeFocused();
    await page.keyboard.press(tecla);
    await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
    await expect(juego(page)).toHaveAttribute("data-modo", "libre");
    await esperarPasos(page, 30);
    expect(await soltadas(page)).toBe(0);
    await expect(juego(page)).toHaveAttribute("data-fase", "apuntando");
    await expect(juego(page)).toHaveAttribute("data-partidas", "1");
  });
}

test("sin el foco en un botón, Espacio en el inicio equivale a «Jugar» (E2)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Teclado: solo en escritorio");
  await preparar(page);
  await page.goto("/");
  await esperarInicio(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Space");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await esperarPasos(page, 30);
  expect(await soltadas(page)).toBe(0);
  await expect(juego(page)).toHaveAttribute("data-partidas", "1");
});

test("la tarjeta del reto dice «Sin jugar» y la racha, y abre Retos; jugado, su medalla y sus puntos (E2)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo DOM: basta con escritorio (R17)");
  await sembrarProgreso(page, { racha: { actual: 3, mejor: 3, ultimoDia: DIA - 1, congeladores: 0 } });
  await preparar(page);
  await page.goto("/");
  await esperarInicio(page);
  const tarjeta = page.getByRole("button", { name: /^Reto de hoy/ });
  await expect(tarjeta).toHaveAccessibleName(`Reto de hoy #${DIA}: sin jugar. Racha de 3 días`);
  await expect(page.locator("#tarjeta-reto-texto")).toHaveText("Sin jugar");
  await expect(page.locator("#tarjeta-reto-marca")).toHaveClass("punto");
  await expect(page.locator("#tarjeta-racha")).toHaveText("3");
  await tarjeta.click();
  await expect(juego(page)).toHaveAttribute("data-estado", "retos");
  await page.keyboard.press("Escape");
  await expect(juego(page)).toHaveAttribute("data-estado", "inicio");
  // El foco vuelve a la tarjeta que abrió el panel.
  await expect(tarjeta).toBeFocused();

  // Con el día de hoy jugado (2.400 puntos con las reglas 3: plata provisional, UMBRALES[3] = v2).
  await page.evaluate((dia) => {
    const p = JSON.parse(localStorage.getItem("torre-diaria:progreso")!);
    p.diarios = { [dia]: { puntos: 2400, piezas: 49, altura: 23.5, perfectos: 42, colocadas: "0-48", enSuDia: true, reglas: 3 } };
    p.racha = { actual: 4, mejor: 4, ultimoDia: dia, congeladores: 0 };
    localStorage.setItem("torre-diaria:progreso", JSON.stringify(p));
  }, DIA);
  await page.reload();
  await esperarInicio(page);
  await expect(tarjeta).toHaveAccessibleName(`Reto de hoy #${DIA}: Plata, 2.400 puntos. Racha de 4 días`);
  await expect(page.locator("#tarjeta-reto-texto")).toHaveText("2.400");
  await expect(page.locator("#tarjeta-reto-marca")).toHaveClass("medalla plata");
});

test("el inicio cabe sin desplazarse en 360×640 y 320×568, con 999.999 monedas en su ficha (E2)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo maquetación: basta con escritorio (R17)");
  await sembrarProgreso(page, { monedas: 999_999 });
  await preparar(page);
  await page.goto("/");
  await esperarInicio(page);
  for (const tam of [
    { width: 360, height: 640 },
    { width: 320, height: 568 },
    { width: 1280, height: 600 },
  ]) {
    await page.setViewportSize(tam);
    const m = await page.evaluate(() => {
      const caja = (id: string) => document.getElementById(id)!.getBoundingClientRect();
      const ficha = document.getElementById("inicio-monedas")!;
      const inicio = document.getElementById("inicio")!;
      const botones = [...inicio.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
      return {
        texto: document.getElementById("inicio-monedas-numero")!.textContent,
        ficha: { scroll: ficha.scrollWidth, cliente: ficha.clientWidth },
        inicio: { scroll: inicio.scrollHeight, cliente: inicio.clientHeight },
        documento: { ancho: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight },
        abajo: Math.max(...botones.map((b) => b.bottom)),
        derecha: Math.max(...botones.map((b) => b.right)),
        jugar: caja("inicio-jugar"),
      };
    });
    const caso = `${tam.width}×${tam.height}`;
    expect(m.texto, caso).toBe("999.999");
    expect(m.ficha.scroll, `ficha de monedas ${caso}`).toBeLessThanOrEqual(m.ficha.cliente);
    expect(m.inicio.scroll, `alto del inicio ${caso}`).toBeLessThanOrEqual(m.inicio.cliente);
    expect(m.documento.ancho, caso).toBeLessThanOrEqual(tam.width);
    expect(m.documento.alto, caso).toBeLessThanOrEqual(tam.height);
    expect(m.abajo, caso).toBeLessThanOrEqual(tam.height);
    expect(m.derecha, caso).toBeLessThanOrEqual(tam.width);
    expect(m.jugar.height, caso).toBeGreaterThanOrEqual(56);
  }
});

test("en la pausa la partida no avanza y al seguir la pieza continúa desde la misma x (E3)", async ({ page }) => {
  const vigilancia = await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await esperarPasos(page, 10);
  await pausar(page);
  await expect(page.locator("#hud-puntos")).toBeVisible();
  await expect(page.locator("#boton-pausa")).toBeHidden();
  const x = await juego(page).getAttribute("data-x");
  const pasos = await juego(page).getAttribute("data-pasos");
  await page.waitForTimeout(2000);
  expect(await juego(page).getAttribute("data-pasos")).toBe(pasos);
  expect(await juego(page).getAttribute("data-x")).toBe(x);
  // Un toque en el panel no suelta la pieza.
  await page.locator("#pausa h2").click();
  // Al seguir, el primer paso sale de la misma x: la pieza no salta.
  const primera = await page.evaluate(
    (antes) =>
      new Promise<{ x: number; pasos: number }>((listo) => {
        const el = document.getElementById("juego")!;
        const mirar = () => {
          if (el.dataset.pasos !== antes) return listo({ x: Number(el.dataset.x), pasos: Number(el.dataset.pasos) });
          requestAnimationFrame(mirar);
        };
        document.getElementById("boton-seguir")!.click();
        mirar();
      }),
    pasos,
  );
  expect(primera.pasos - Number(pasos)).toBeLessThanOrEqual(5);
  expect(Math.abs(primera.x - Number(x))).toBeLessThan(0.2);
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  expect(await soltadas(page)).toBe(0);
  expect(vigilancia.errores).toEqual([]);
});

test("Escape y P pausan y siguen; desde la pausa, «Inicio» deja la partida (E3)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Teclado: solo en escritorio");
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await page.keyboard.press("Escape");
  await expect(juego(page)).toHaveAttribute("data-estado", "pausa");
  await expect(page.locator("#boton-seguir")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await page.keyboard.press("p");
  await expect(juego(page)).toHaveAttribute("data-estado", "pausa");
  await page.keyboard.press("P");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  // Tras seguir con el teclado, Espacio vuelve a soltar la pieza.
  await page.keyboard.press("Space");
  await expect.poll(() => soltadas(page)).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Inicio" })).toBeVisible();
  await irAlInicio(page);
  await expect(page.locator("#hud")).toBeHidden();
  await expect(page.locator("#inicio-jugar")).toBeFocused();
});

test("en el reto de hoy la pausa solo ofrece «Seguir» y «Ajustes», sin «Inicio» (E3, R-3)", async ({ page }) => {
  await preparar(page);
  await page.goto("/");
  await empezarHoy(page);
  await pausar(page);
  await expect(page.locator("#pausa-texto")).toHaveText(`Reto del día #${DIA}: cuenta al acabar la partida.`);
  await expect(page.locator("#pausa-inicio")).toBeHidden();
  await expect(page.locator("#pausa").getByRole("button")).toHaveText(["Seguir", "Ajustes"]);
  await page.getByRole("button", { name: "Ajustes" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "ajustes");
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "pausa");
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  await expect(juego(page)).toHaveAttribute("data-modo", "oficial");
});

test("desde el fin, «Inicio» lleva al inicio y Espacio sigue siendo «Otra vez» (E3)", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await expect(page.locator("#boton-inicio")).toBeVisible();
  await irAlInicio(page);
  await expect(page.locator("#inicio-siguiente")).toBeVisible();
  if (conTactil(testInfo)) return;
  await jugarLibre(page);
  await jugarHastaElFin(page, false);
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  await page.waitForTimeout(800);
  await page.keyboard.press("Space");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  // La tercera partida de la página: la primera, «Jugar» y ahora Espacio en el fin.
  await expect(juego(page)).toHaveAttribute("data-partidas", "3");
});

test("Créditos y licencias nombra la letra, planck, la música original y la privacidad; la versión dice reglas 3 (C2)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo DOM: basta con escritorio (R17)");
  await preparar(page);
  await page.goto("/");
  await abrirAjustes(page);
  const creditos = page.getByRole("button", { name: "Créditos y licencias" });
  await expect(creditos).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#creditos")).toBeHidden();
  await creditos.click();
  await expect(creditos).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#creditos")).toContainText("Bricolage Grotesque (OFL-1.1)");
  await expect(page.locator("#creditos")).toContainText("planck (MIT)");
  await expect(page.locator("#creditos")).toContainText("Música original compuesta en código para Torre Diaria");
  await expect(page.locator("#creditos")).toContainText("Todo se guarda solo en este navegador. No hay cuentas, ni cookies de terceros, ni anuncios.");
  await expect(page.locator("#ajustes-version")).toHaveText("Torre Diaria · reglas 3");
  // Sin efectos reducidos propios ni «Cómo se juega» (R-1, R-9); Música, Sonidos y Vibración, en ese orden (D).
  await expect(page.locator("#ajustes")).not.toContainText(/efectos reducidos|cómo se juega/i);
  expect(await page.locator("#ajustes .interruptor").evaluateAll((botones) => botones.map((b) => b.id))).toEqual(["ajuste-musica", "ajuste-sonidos", "ajuste-vibracion"]);
});
