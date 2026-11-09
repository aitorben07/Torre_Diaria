// Bloque C: guardado v2, migración de la v1, monedas, récord, colección y
// ajustes guardados.
import { expect, test } from "@playwright/test";
import { abrirAjustes, abrirColeccion, abrirRetos, CLAVE_PROGRESO, conTactil, DIA, empezarHoy, esperarFinListo, esperarInicio, irAlInicio, juego, jugarHastaElFin, jugarLibre, leerProgreso, preparar, sembrarProgreso, tocar } from "./ayudas.ts";

test("solo se escribe torre-diaria:progreso, y un día de la v1 se ve en piezas, sin medalla (C1)", async ({ page }, testInfo) => {
  const v1 = JSON.stringify({ dia: DIA, puntos: 7, altura: 4.2, formas: [{ forma: "bloque", color: 0 }] });
  await page.addInitScript((valor) => {
    if (!sessionStorage.getItem("v1")) {
      sessionStorage.setItem("v1", "1");
      localStorage.setItem("torre-diaria:resultado", valor);
      localStorage.setItem("torre-diaria:libre", JSON.stringify({ record: 540, tutorialVisto: true }));
    }
    // Las claves escritas en localStorage se apuntan en sessionStorage, que sigue entre cargas.
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (clave: string, texto: string) {
      if (this === localStorage) {
        const escritas = JSON.parse(sessionStorage.getItem("escritas") ?? "[]") as string[];
        original.call(sessionStorage, "escritas", JSON.stringify([...escritas, clave]));
      }
      return original.call(this, clave, texto);
    };
  }, v1);
  const { errores } = await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  // El récord libre y el aviso visto vienen de la clave vieja.
  await expect(page.locator("#record")).toHaveText("Récord 540");
  await expect(page.getByText("Toca para soltar")).toBeHidden();
  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);

  await page.goto(`/?reto=${DIA}.5`);
  await page.getByRole("button", { name: "Ver mi resultado de hoy" }).click();
  await expect(page.locator("#fin-puntos")).toHaveText("7 piezas");
  await expect(page.locator("#fin-medalla-texto")).toHaveText("Sin medalla · con la versión anterior");
  // Las piezas no son puntos: la tarjeta no reta con ?reto=<día>.7.
  await expect(page.locator("#tarjeta")).toContainText("7 piezas");
  await expect(page.locator("#tarjeta")).not.toContainText("reto=");
  const escritas = await page.evaluate(() => JSON.parse(sessionStorage.getItem("escritas") ?? "[]") as string[]);
  expect(new Set(escritas)).toEqual(new Set([CLAVE_PROGRESO]));
  expect(await page.evaluate(() => localStorage.getItem("torre-diaria:resultado"))).toBe(v1);
  expect((await leerProgreso(page))!.diarios[DIA]).toMatchObject({ piezas: 7, puntos: 0, reglas: 1 });
  expect(errores).toEqual([]);
});

test("las monedas de la partida libre se suman una vez: recargar en el fin no las vuelve a sumar (C2)", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 2 });
  const ganadas = Number(await juego(page).getAttribute("data-ganadas"));
  expect(ganadas).toBeGreaterThan(0);
  await expect(page.locator("#fin-monedas")).toBeVisible();
  const monedas = (await leerProgreso(page))!.monedas;
  expect(monedas).toBe(ganadas);
  await expect(juego(page)).toHaveAttribute("data-monedas", String(monedas));
  await page.reload();
  await esperarInicio(page);
  expect((await leerProgreso(page))!.monedas).toBe(monedas);
  // La ficha de monedas del inicio (E2).
  await expect(page.locator("#inicio-monedas")).toHaveAccessibleName(`Colección: ${monedas} ${monedas === 1 ? "moneda" : "monedas"}`);
});

for (const [record, nuevo] of [
  [5, true],
  [999_999, false],
] as const) {
  test(`con récord ${record}, ${nuevo ? "superarlo muestra «¡Nuevo récord!» y lo guarda" : "no superarlo no lo muestra"} (C2)`, async ({ page }, testInfo) => {
    await sembrarProgreso(page, { libre: { record, alturaRecord: 1, partidas: 1 }, ajustes: { sonido: true, vibracion: true, tutorialVisto: true } });
    await preparar(page);
    await page.goto("/");
    await jugarLibre(page);
    await jugarHastaElFin(page, conTactil(testInfo), { centradas: 2 });
    const puntos = Number(await juego(page).getAttribute("data-puntos"));
    expect(puntos).toBeGreaterThan(5);
    if (nuevo) {
      await expect(page.getByText("¡Nuevo récord!")).toBeVisible();
      expect((await leerProgreso(page))!.libre.record).toBe(puntos);
    } else {
      await expect(page.getByText("¡Nuevo récord!")).toBeHidden();
      expect((await leerProgreso(page))!.libre.record).toBe(record);
    }
  });
}

test("comprar Madera resta su precio, la pone en el lienzo y sigue tras recargar; sin monedas no se puede (C3)", async ({ page }) => {
  await sembrarProgreso(page, { monedas: 1000 });
  const { errores } = await preparar(page);
  await page.goto("/");
  await expect(page.locator("#lienzo")).toHaveAttribute("data-tema", "riso");
  await abrirColeccion(page);
  // Cada artículo de la pestaña tiene su muestra dibujada.
  for (const pestana of ["Escenarios", "Piezas"]) {
    await page.getByRole("tab", { name: pestana }).click();
    const muestras = page.locator("#articulos .muestra");
    await expect(muestras).toHaveCount(pestana === "Piezas" ? 6 : 3);
    const pintadas = await muestras.evaluateAll((lienzos) =>
      (lienzos as HTMLCanvasElement[]).map((l) => {
        const datos = l.getContext("2d")!.getImageData(0, 0, l.width, l.height).data;
        const colores = new Set<number>();
        for (let i = 0; i < datos.length; i += 4 * 97) colores.add((datos[i]! << 16) | (datos[i + 1]! << 8) | datos[i + 2]!);
        return colores.size;
      }),
    );
    for (const colores of pintadas) expect(colores).toBeGreaterThan(5);
  }
  await expect(page.getByRole("button", { name: "Comprar Oro por 4.200 monedas" })).toBeDisabled();
  await page.getByRole("button", { name: "Comprar Madera por 300 monedas" }).click();
  await expect(page.locator("#coleccion-monedas")).toHaveText("700");
  await expect(page.locator('[data-articulo="madera"]')).toHaveAttribute("data-estado-articulo", "equipado");
  await expect(page.locator("#lienzo")).toHaveAttribute("data-tema", "madera");
  expect((await leerProgreso(page))!).toMatchObject({ monedas: 700, catalogo: { comprados: ["madera"], equipado: { tema: "madera" } } });

  await page.reload();
  await esperarInicio(page);
  await expect(page.locator("#lienzo")).toHaveAttribute("data-tema", "madera");
  expect((await leerProgreso(page))!.monedas).toBe(700);
  expect(errores).toEqual([]);
});

test("una racha de 3 desbloquea la Ciudad aunque la altura récord sea menor de 25 m (C3)", async ({ page }) => {
  await sembrarProgreso(page, { libre: { record: 100, alturaRecord: 3, partidas: 1 }, racha: { actual: 0, mejor: 3, ultimoDia: 1, congeladores: 0 } });
  await preparar(page);
  await page.goto("/");
  await abrirColeccion(page);
  await page.getByRole("tab", { name: "Escenarios" }).click();
  await expect(page.locator('[data-articulo="nubes"]')).toHaveAttribute("data-estado-articulo", "bloqueado");
  await page.getByRole("button", { name: "Usar Ciudad" }).click();
  await expect(page.locator("#lienzo")).toHaveAttribute("data-escenario", "ciudad");
  await page.getByRole("button", { name: "Cerrar" }).first().click();
  await expect(juego(page)).toHaveAttribute("data-estado", "inicio");
});

test("«Usar» vuelve a salir con el segundo escenario nuevo de la misma sesión (C3)", async ({ page }, testInfo) => {
  await sembrarProgreso(page, { racha: { actual: 2, mejor: 2, ultimoDia: DIA - 1, congeladores: 0 } });
  await preparar(page);
  await page.goto("/");
  const usar = page.getByRole("button", { name: "Usar", exact: true });

  // Racha de 3 en el reto de hoy: la Ciudad.
  await empezarHoy(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);
  await expect(page.locator("#fin-desbloqueo-texto")).toHaveText("Nuevo escenario: Ciudad");
  await usar.click();
  await expect(usar).toBeHidden();
  await expect(page.locator("#lienzo")).toHaveAttribute("data-escenario", "ciudad");

  // Como si otra pestaña dejara la racha en 6 y el día de hoy sin jugar: la racha de 7 da las Nubes.
  await page.evaluate((clave) => {
    const progreso = JSON.parse(localStorage.getItem(clave)!);
    progreso.diarios = {};
    progreso.racha = { ...progreso.racha, actual: 6, mejor: 6, ultimoDia: progreso.racha.ultimoDia - 1 };
    localStorage.setItem(clave, JSON.stringify(progreso));
  }, CLAVE_PROGRESO);
  await irAlInicio(page);
  await empezarHoy(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);
  await expect(page.locator("#fin-desbloqueo-texto")).toHaveText("Nuevo escenario: Nubes");
  await expect(usar).toBeVisible();
  await usar.click();
  await expect(page.locator("#lienzo")).toHaveAttribute("data-escenario", "nubes");
});

test("sonidos y vibración apagados en Ajustes se guardan y siguen apagados tras recargar (C1, C2)", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: () => true });
  });
  await preparar(page);
  await page.goto("/");
  await abrirAjustes(page);
  const sonidos = page.getByRole("switch", { name: "Sonidos" });
  const vibracion = page.getByRole("switch", { name: "Vibración" });
  await expect(sonidos).toHaveAttribute("aria-checked", "true");
  await expect(vibracion).toHaveAttribute("aria-checked", "true");
  await sonidos.click();
  await expect(sonidos).toHaveAttribute("aria-checked", "false");
  await vibracion.click();
  await expect(vibracion).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await abrirAjustes(page);
  await expect(sonidos).toHaveAttribute("aria-checked", "false");
  await expect(vibracion).toHaveAttribute("aria-checked", "false");
  expect((await leerProgreso(page))!.ajustes).toMatchObject({ sonido: false, vibracion: false });
});

test("un progreso con texto hostil no inyecta nada y el juego sigue (G5, G10)", async ({ page }, testInfo) => {
  let dialogos = 0;
  page.on("dialog", async (dialogo) => {
    dialogos++;
    await dialogo.dismiss();
  });
  const hostil = "<img src=x onerror=alert(1)>";
  await sembrarProgreso(page, {
    monedas: hostil,
    catalogo: { comprados: [hostil], equipado: { tema: hostil, escenario: hostil } },
    diarios: { [DIA]: { puntos: hostil, colocadas: hostil }, [hostil]: {} },
    ultimaCobrada: hostil,
  });
  const { errores } = await preparar(page);
  await page.goto("/");
  await abrirRetos(page);
  await page.keyboard.press("Escape");
  await abrirColeccion(page);
  await page.keyboard.press("Escape");
  await jugarLibre(page);
  await tocar(page, conTactil(testInfo));
  expect(await page.locator("img").count()).toBe(0);
  expect(await page.locator("body").innerHTML()).not.toContain("onerror");
  expect(dialogos).toBe(0);
  expect(errores).toEqual([]);
});
