import { defineConfig } from "astro/config";

// Sitio estático de una página para Cloudflare Pages. Sin `site`: el enlace de
// la tarjeta usa `location.origin` al ejecutarse (D10).
export default defineConfig({
  output: "static",
  build: {
    // Hojas de estilo siempre en archivo aparte, para que la CSP de
    // `public/_headers` no necesite 'unsafe-inline' (T11).
    inlineStylesheets: "never",
  },
});
