// T8 y T11: comprobaciones sobre dist/ (el servidor de pruebas compila antes).
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const DIST = new URL("../dist/", import.meta.url);
const archivos = () => (readdirSync(DIST, { recursive: true }) as string[]).map((ruta) => ruta.replaceAll("\\", "/"));
const html = () => readFileSync(new URL("index.html", DIST), "utf8");

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Basta con un proyecto: no depende del navegador");
});

test("dist/ no contiene imágenes, audio ni fuentes", () => {
  const prohibidos = /\.(png|jpe?g|gif|webp|avif|ico|mp3|ogg|wav|woff2?|ttf|otf)$/i;
  expect(archivos().filter((ruta) => prohibidos.test(ruta))).toEqual([]);
  expect(html()).toMatch(/<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,/);
});

test("dist/_headers existe y lleva la CSP", () => {
  const cabeceras = readFileSync(new URL("_headers", DIST), "utf8");
  expect(cabeceras).toContain("Content-Security-Policy:");
  expect(cabeceras).toContain("X-Content-Type-Options: nosniff");
  expect(cabeceras).toContain("Referrer-Policy:");
  expect(cabeceras).not.toContain("unsafe-inline");
  expect(cabeceras).not.toMatch(/https?:\/\//);
});

test("dist/index.html no tiene <style> ni <script> con código en línea", () => {
  const pagina = html();
  expect(pagina).not.toMatch(/<style[\s>]/i);
  for (const etiqueta of pagina.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? []) {
    expect(etiqueta).toMatch(/^<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>$/i);
  }
  expect(pagina).not.toMatch(/\son[a-z]+="/i);
  expect(pagina).not.toMatch(/\sstyle="/i);
});

test("el HTML tiene og:title, og:description y viewport con width=device-width", () => {
  const pagina = html();
  expect(pagina).toMatch(/<meta property="og:title" content="Torre Diaria">/);
  expect(pagina).toMatch(/<meta property="og:description" content="[^"]+">/);
  expect(pagina).toMatch(/<meta name="viewport" content="width=device-width[^"]*">/);
  expect(pagina).toMatch(/<meta name="description" content="[^"]+">/);
  expect(pagina).toMatch(/<meta name="theme-color" content="[^"]+">/);
});

test("el JavaScript de dist/ ocupa menos de 150 KB con gzip", () => {
  const js = archivos().filter((ruta) => ruta.endsWith(".js"));
  const bytes = js.reduce((total, ruta) => total + gzipSync(readFileSync(new URL(ruta, DIST)), { level: 9 }).length, 0);
  test.info().annotations.push({ type: "gzip", description: `${(bytes / 1024).toFixed(1)} KB en ${js.length} archivo(s)` });
  expect(bytes).toBeLessThan(150 * 1024);
});
