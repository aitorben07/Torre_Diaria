// T11: la partida de T10 con la CSP de dist/_headers aplicada a las respuestas
// de `astro preview` mediante `page.route`, sin instalar wrangler.
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { conTactil, datosFin, DIA, empezarHoy, esperarFinListo, jugarHastaElFin, preparar } from "./ayudas.ts";

function cabecerasDeDist(): Record<string, string> {
  const texto = readFileSync(new URL("../dist/_headers", import.meta.url), "utf8");
  const cabeceras: Record<string, string> = {};
  for (const linea of texto.split(/\r?\n/)) {
    const encontrada = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(linea);
    if (encontrada) cabeceras[encontrada[1]!.toLowerCase()] = encontrada[2]!.trim();
  }
  return cabeceras;
}

test("la partida completa pasa con la CSP sin errores de CSP", async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const cabeceras = cabecerasDeDist();
  expect(cabeceras["content-security-policy"]).toBeTruthy();
  expect(cabeceras["content-security-policy"]).toContain("font-src 'self'");
  await page.route("**/*", async (ruta) => {
    const respuesta = await ruta.fetch();
    await ruta.fulfill({ response: respuesta, headers: { ...respuesta.headers(), ...cabeceras } });
  });
  await page.addInitScript(() => {
    const violaciones: string[] = [];
    (window as unknown as { __violaciones: string[] }).__violaciones = violaciones;
    document.addEventListener("securitypolicyviolation", (evento) => violaciones.push(evento.violatedDirective));
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const vigilancia = await preparar(page);

  const respuesta = await page.goto("/");
  expect(respuesta?.headers()["content-security-policy"]).toBe(cabeceras["content-security-policy"]);
  await empezarHoy(page);
  await jugarHastaElFin(page, conTactil(testInfo), { conRetraso: 3, retrasoMs: 1600 });
  await datosFin(page);
  // «Copiar» ignora los primeros 700 ms del fin.
  await esperarFinListo(page);
  await page.getByRole("button", { name: "Copiar" }).click();
  await expect(page.locator("#mensaje")).toHaveText("Copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`Torre Diaria #${DIA}`);

  // La fuente local se carga con la CSP aplicada (A1).
  expect(await page.evaluate(() => document.fonts.check('16px "Bricolage Grotesque Variable"'))).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __violaciones: string[] }).__violaciones)).toEqual([]);
  expect(vigilancia.errores).toEqual([]);
});
