import { defineConfig } from "vitest/config";

// Las pruebas de la lógica, del bucle y de los jugadores simulados de scripts/;
// las de navegador van con Playwright.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
  },
});
