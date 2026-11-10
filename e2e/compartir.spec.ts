// F1, F2 y F3: enlace de partida libre, tarjeta sin emojis, imagen PNG y compartir con archivo.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { COLORES, TEMA_RISO } from "../src/juego/temas.ts";
import { deTramos } from "../src/logica/progreso.ts";
import { abrirColeccion, abrirNiveles, abrirRetos, conTactil, datosFin, DIA, esperarFinListo, esperarLibre, juego, jugarHastaElFin, jugarLibre, preparar, sembrarProgreso } from "./ayudas.ts";

test("abrir /?libre=<código>.300 avisa con 300 y hace jugar esa semilla, que cuenta como libre (F2)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const vigilancia = await preparar(page);
  await page.goto("/?libre=a1b2c3.300");
  await expect(juego(page)).toHaveAttribute("data-estado", "reto");
  await expect(page.locator("#aviso-reto")).toHaveText("Tu amigo hizo 300 puntos en esta partida. ¿Le superas?");
  await page.getByRole("button", { name: "Jugar esta partida" }).click();
  await esperarLibre(page);
  await expect(juego(page)).toHaveAttribute("data-semilla", "libre-a1b2c3");
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 2 });
  const fin = await datosFin(page);
  expect(fin.semilla).toBe("libre-a1b2c3");
  await expect(page.locator("#fin-reto")).toContainText("300 puntos");
  await expect(page.locator("#tarjeta")).toContainText(`/?libre=a1b2c3.${fin.puntos}`);
  // Cuenta para monedas y récord como cualquier libre.
  await expect(juego(page)).not.toHaveAttribute("data-ganadas", "0");
  expect(vigilancia.errores).toEqual([]);
});

test("la tarjeta de texto no lleva emojis en el fin libre (F2)", async ({ page }, testInfo) => {
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  const texto = (await page.locator("#tarjeta").textContent()) ?? "";
  expect(texto).toMatch(/^Torre Diaria: .+ en partida libre\.\n¿Me superas\? http.+\/\?libre=[0-9a-z]{1,7}\.\d+$/);
  expect(texto).not.toMatch(/\p{Extended_Pictographic}/u);
});

/** Lee ancho y alto de la cabecera IHDR de un PNG. */
function medidasPNG(png: Buffer): { ancho: number; alto: number } {
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
}

/** Pulsa `boton` (que descarga la imagen) y devuelve el PNG descargado y su nombre. */
async function descargarCon(page: Page, boton: string): Promise<{ png: Buffer; nombre: string }> {
  const descarga = page.waitForEvent("download");
  await page.locator(boton).click();
  const hecha = await descarga;
  return { png: readFileSync((await hecha.path())!), nombre: hecha.suggestedFilename() };
}

function comprobarPNG(png: Buffer): void {
  expect(medidasPNG(png)).toEqual({ ancho: 1080, alto: 1350 });
  expect(png.length).toBeLessThanOrEqual(600 * 1024);
}

/** Navegador sin Web Share. */
const sinShare = () => {
  delete (Navigator.prototype as { share?: unknown }).share;
  delete (navigator as { share?: unknown }).share;
  delete (Navigator.prototype as { canShare?: unknown }).canShare;
  delete (navigator as { canShare?: unknown }).canShare;
};

const dia = (colocadas: string, puntos = 300) => ({ puntos, piezas: deTramos(colocadas)!.length, altura: 12.3, perfectos: 9, colocadas, enSuDia: true, reglas: 2 });

test("la imagen de la partida libre es un PNG de 1080×1350 de 600 KB como mucho (F1)", async ({ page }, testInfo) => {
  await page.addInitScript(sinShare);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 3 });
  await esperarFinListo(page);
  const { png, nombre } = await descargarCon(page, "#boton-descargar");
  comprobarPNG(png);
  expect(nombre).toBe("torre-diaria-libre.png");
  expect(vigilancia.errores).toEqual([]);
  expect(vigilancia.ajenas).toEqual([]);
});

test("la imagen del reto diario es un PNG de 1080×1350 de 600 KB como mucho (F1)", async ({ page }) => {
  await page.addInitScript(sinShare);
  await sembrarProgreso(page, { diarios: { [DIA]: dia("0-29", 1240) } });
  const vigilancia = await preparar(page);
  await page.goto(`/?reto=${DIA}.5`);
  await page.getByRole("button", { name: "Ver mi resultado de hoy" }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "fin");
  const { png, nombre } = await descargarCon(page, "#boton-descargar");
  comprobarPNG(png);
  expect(nombre).toBe("torre-diaria-reto.png");
  expect(vigilancia.errores).toEqual([]);
});

test("la imagen de un nivel es un PNG de 1080×1350 de 600 KB como mucho (F1)", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.addInitScript(sinShare);
  const vigilancia = await preparar(page);
  await page.goto("/");
  await abrirNiveles(page);
  await page.getByRole("button", { name: "Jugar nivel 1", exact: true }).click();
  await jugarHastaElFin(page, conTactil(testInfo), { centradas: 10 });
  await esperarFinListo(page);
  const { png, nombre } = await descargarCon(page, "#boton-descargar");
  comprobarPNG(png);
  expect(nombre).toBe("torre-diaria-nivel.png");
  expect(vigilancia.errores).toEqual([]);
});

test("con 0, 1 y 200 piezas la imagen del día se genera sin errores desde la ficha de Retos (F1, F3)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(sinShare);
  await sembrarProgreso(page, { diarios: { 13: dia(""), 14: dia("0"), 15: dia("0-199", 9000) } });
  const vigilancia = await preparar(page);
  await page.goto("/");
  await abrirRetos(page);
  for (const d of [13, 14, 15]) {
    await page.locator(`#dia-${d}`).click();
    await expect(page.locator("#ficha-descargar")).toBeVisible();
    const { png } = await descargarCon(page, "#ficha-descargar");
    comprobarPNG(png);
  }
  expect(vigilancia.errores).toEqual([]);
});

test("la imagen de la ficha del día se vuelve a generar al cambiar de tema (F3)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Basta con Chromium de escritorio");
  await page.addInitScript(sinShare);
  await sembrarProgreso(page, { diarios: { [DIA]: dia("0-29", 1240) }, catalogo: { comprados: ["madera"], equipado: { tema: "riso", escenario: "puerto" } } });
  await preparar(page);
  await page.goto("/");
  await abrirRetos(page);
  await page.locator(`#dia-${DIA}`).click();
  const { png: conRiso } = await descargarCon(page, "#ficha-descargar");

  await page.keyboard.press("Escape");
  await abrirColeccion(page);
  await page.getByRole("button", { name: "Usar Madera" }).click();
  await expect(page.locator("#lienzo")).toHaveAttribute("data-tema", "madera");
  await page.keyboard.press("Escape");
  await abrirRetos(page);
  await page.locator(`#dia-${DIA}`).click();
  const { png: conMadera } = await descargarCon(page, "#ficha-descargar");
  comprobarPNG(conMadera);
  expect(conMadera.equals(conRiso)).toBe(false);
});

test("la imagen de un resultado fijado tiene papel en la esquina, tinta en la cabecera y los colores de las piezas (F1)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Basta con Chromium de escritorio");
  await page.addInitScript(sinShare);
  await sembrarProgreso(page, { diarios: { [DIA]: dia("0-29", 1240) } });
  await preparar(page);
  await page.goto(`/?reto=${DIA}.5`);
  await page.getByRole("button", { name: "Ver mi resultado de hoy" }).click();
  const { png } = await descargarCon(page, "#boton-descargar");
  // Píxeles concretos, que valen igual en Windows y en Linux (impacto, F1), en vez de una captura de referencia.
  const analisis = await page.evaluate(
    async ([base64, paleta, papel, tinta]) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const mapa = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const lienzo = document.createElement("canvas");
      lienzo.width = mapa.width;
      lienzo.height = mapa.height;
      const ctx = lienzo.getContext("2d")!;
      ctx.drawImage(mapa, 0, 0);
      const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const cerca = (d: Uint8ClampedArray, i: number, color: number[], tolerancia: number) =>
        Math.abs(d[i]! - color[0]!) + Math.abs(d[i + 1]! - color[1]!) + Math.abs(d[i + 2]! - color[2]!) <= tolerancia;
      const esquina = ctx.getImageData(0, 0, 1, 1).data;
      const cabecera = ctx.getImageData(60, 60, 960, 130).data;
      let enTinta = 0;
      for (let i = 0; i < cabecera.length; i += 4) if (cerca(cabecera, i, rgb(tinta), 30)) enTinta++;
      const torre = ctx.getImageData(240, 300, 600, 630).data;
      const presentes = paleta.filter((color) => {
        let n = 0;
        for (let i = 0; i < torre.length; i += 4) if (cerca(torre, i, rgb(color), 12)) n++;
        return n >= 200;
      });
      return { esquina: [...esquina].slice(0, 3), papel: rgb(papel), enTinta, presentes: presentes.length };
    },
    [png.toString("base64"), [...TEMA_RISO.piezas], COLORES.papel, COLORES.tinta] as const,
  );
  expect(analisis.esquina).toEqual(analisis.papel);
  expect(analisis.enTinta).toBeGreaterThan(5000);
  expect(analisis.presentes).toBeGreaterThanOrEqual(4);
});

type Llamada = { claves: string[]; text: string; archivos: Array<{ esFile: boolean; tipo: string; nombre: string; bytes: number }> };

test("con canShare y share que aceptan archivos, Compartir llama una vez a share con el PNG y el texto con el enlace, sin url (F3)", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const llamadas: unknown[] = [];
    (window as unknown as { __compartido: unknown[] }).__compartido = llamadas;
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (datos: { files?: File[] }) => Array.isArray(datos?.files) && datos.files.every((f) => f.type === "image/png"),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (datos: { text?: string; files?: File[] }) =>
        void llamadas.push({
          claves: Object.keys(datos).sort(),
          text: datos.text,
          archivos: (datos.files ?? []).map((f) => ({ esFile: f instanceof File, tipo: f.type, nombre: f.name, bytes: f.size })),
        }),
    });
  });
  const vigilancia = await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);
  // Con archivos en share no hace falta «Descargar imagen».
  await expect(page.locator("#boton-descargar")).toBeHidden();
  await page.getByRole("button", { name: "Compartir" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __compartido: unknown[] }).__compartido.length)).toBe(1);
  const [llamada] = await page.evaluate(() => (window as unknown as { __compartido: Llamada[] }).__compartido);
  expect(llamada!.claves).toEqual(["files", "text"]);
  expect(llamada!.text).toContain("/?libre=");
  expect(llamada!.archivos).toHaveLength(1);
  expect(llamada!.archivos[0]).toMatchObject({ esFile: true, tipo: "image/png", nombre: "torre-diaria-libre.png" });
  expect(llamada!.archivos[0]!.bytes).toBeGreaterThan(1000);
  await expect(page.locator("#mensaje")).toHaveText("");
  expect(vigilancia.errores).toEqual([]);
});

test("sin archivos pero con share, se comparte solo el texto y se ofrece «Descargar imagen» (F3)", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const llamadas: unknown[] = [];
    (window as unknown as { __compartido: unknown[] }).__compartido = llamadas;
    delete (Navigator.prototype as { canShare?: unknown }).canShare;
    delete (navigator as { canShare?: unknown }).canShare;
    Object.defineProperty(navigator, "share", { configurable: true, value: async (datos: object) => void llamadas.push(Object.keys(datos)) });
  });
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);
  await expect(page.locator("#boton-descargar")).toBeVisible();
  await page.getByRole("button", { name: "Compartir" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __compartido: unknown[] }).__compartido)).toEqual([["text"]]);
});

test("sin navigator.share, «Descargar imagen» descarga un .png y «Copiar texto» copia el texto (F3)", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(sinShare);
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);
  await expect(page.locator("#boton-compartir")).toBeHidden();
  const { png, nombre } = await descargarCon(page, "#boton-descargar");
  expect(nombre).toMatch(/\.png$/);
  comprobarPNG(png);
  await page.getByRole("button", { name: "Copiar texto" }).click();
  await expect(page.locator("#mensaje")).toHaveText("Copiado");
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiado.replaceAll("\r\n", "\n")).toBe(await page.locator("#tarjeta").textContent());
});

test("tras «Descargar imagen» el foco vuelve al botón principal y Espacio empieza otra partida, sin otra descarga (F3, B5)", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Teclado: solo en escritorio");
  await page.addInitScript(sinShare);
  await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, false);
  await esperarFinListo(page);
  await page.locator("#boton-descargar").focus();
  const descarga = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  await descarga;
  await expect(page.locator("#boton-otra-vez")).toBeFocused();
  let otras = 0;
  page.on("download", () => otras++);
  await page.keyboard.press("Space");
  await expect(juego(page)).toHaveAttribute("data-estado", "jugando");
  expect(otras).toBe(0);
});

test("un share que rechaza con NotAllowedError muestra «Descargar imagen» sin error (F3)", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Sin gesto", "NotAllowedError");
      },
    });
  });
  const vigilancia = await preparar(page);
  await page.goto("/");
  await jugarLibre(page);
  await jugarHastaElFin(page, conTactil(testInfo));
  await esperarFinListo(page);
  await expect(page.locator("#boton-descargar")).toBeHidden();
  await page.getByRole("button", { name: "Compartir" }).click();
  await expect(page.locator("#boton-descargar")).toBeVisible();
  await expect(page.locator("#mensaje")).toHaveText("");
  expect(vigilancia.errores).toEqual([]);
});
