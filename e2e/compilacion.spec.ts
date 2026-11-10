// T8 y T11: comprobaciones sobre dist/ (el servidor de pruebas compila antes).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

const DIST = new URL("../dist/", import.meta.url);
const archivos = () => (readdirSync(DIST, { recursive: true }) as string[]).map((ruta) => ruta.replaceAll("\\", "/"));
const html = () => readFileSync(new URL("index.html", DIST), "utf8");

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Basta con un proyecto: no depende del navegador");
});

test("dist/ no contiene imágenes ni audio, y las únicas fuentes son .woff2 de _astro/ (G6, G8, A4)", () => {
  const prohibidos = /\.(png|jpe?g|gif|webp|avif|ico|bmp|mp3|ogg|wav|m4a|aac|flac|woff|ttf|otf|eot)$/i;
  expect(archivos().filter((ruta) => prohibidos.test(ruta))).toEqual([]);
  expect(archivos().filter((ruta) => ruta.endsWith(".woff2") && !ruta.startsWith("_astro/"))).toEqual([]);
  expect(html()).toMatch(/<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,/);
});

test("las fuentes de dist/ suman como mucho 80 KB y va la licencia OFL (A1, G8)", () => {
  const fuentes = archivos().filter((ruta) => ruta.endsWith(".woff2"));
  expect(fuentes.length).toBeGreaterThan(0);
  const bytes = fuentes.reduce((total, ruta) => total + statSync(new URL(ruta, DIST)).size, 0);
  test.info().annotations.push({ type: "fuentes", description: `${bytes} B en ${fuentes.length} archivo(s)` });
  expect(bytes).toBeLessThanOrEqual(80 * 1024);
  // La descarga en español es solo el subconjunto latino (impacto, G8).
  const latino = fuentes.find((ruta) => /latin-wght/.test(ruta));
  expect(latino && statSync(new URL(latino, DIST)).size).toBeLessThanOrEqual(45 * 1024);
  expect(readFileSync(new URL("fuentes/OFL.txt", DIST), "utf8")).toContain("SIL Open Font License");
});

test("dist/_headers existe y lleva la CSP", () => {
  const cabeceras = readFileSync(new URL("_headers", DIST), "utf8");
  expect(cabeceras).toContain("Content-Security-Policy:");
  expect(cabeceras).toContain("X-Content-Type-Options: nosniff");
  expect(cabeceras).toContain("Referrer-Policy:");
  expect(cabeceras).not.toContain("unsafe-inline");
  expect(cabeceras).not.toMatch(/https?:\/\//);
  // Único cambio de la CSP en la v2: las fuentes propias (A1).
  expect(cabeceras).toContain("font-src 'self'");
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

test("dist/ no lleva direcciones de SDK de anuncios (G1)", () => {
  const textos = archivos().filter((ruta) => /\.(html|js|css|txt)$|_headers$/.test(ruta));
  expect(textos.length).toBeGreaterThan(0);
  for (const ruta of textos) {
    expect(readFileSync(new URL(ruta, DIST), "utf8"), ruta).not.toMatch(/crazygames|poki|googlesyndication|adsbygoogle/i);
  }
});

test("el favicon es un SVG en línea (data:image/svg+xml) sin texto, y no hay otro icono (G1, R11)", () => {
  const iconos = html().match(/<link rel="icon"[^>]*>/g) ?? [];
  expect(iconos).toHaveLength(1);
  const href = /href="([^"]+)"/.exec(iconos[0]!)?.[1] ?? "";
  expect(href.startsWith("data:image/svg+xml,")).toBe(true);
  const svg = decodeURIComponent(href.slice("data:image/svg+xml,".length).replace(/&amp;/g, "&").replace(/&#39;/g, "'"));
  expect(svg).toMatch(/^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg' viewBox='0 0 32 32'>/);
  expect(svg).not.toMatch(/<text|<image|href=/);
});

test("dist/ no lleva el código de la demostración y dist-demo/ sí (R14, K3)", () => {
  const textos = (carpeta: URL) =>
    (readdirSync(carpeta, { recursive: true }) as string[])
      .filter((ruta) => /\.(html|js|css)$/.test(ruta))
      .map((ruta) => readFileSync(new URL(ruta.replaceAll("\\", "/"), carpeta), "utf8"))
      .join("\n");
  const DEMO = /Demostración|Vídeo de prueba|Pago simulado/;
  expect(textos(DIST)).not.toMatch(DEMO);
  // El servidor del proyecto `demo` compila dist-demo/ a la vez: ahí sí están, así que la búsqueda no da un falso «limpio».
  const demo = textos(new URL("../dist-demo/", import.meta.url));
  for (const texto of ["Demostración", "Vídeo de prueba", "Pago simulado"]) expect(demo).toContain(texto);
});
