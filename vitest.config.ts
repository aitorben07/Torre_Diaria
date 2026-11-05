import { defineConfig } from "vitest/config";

// Solo las pruebas de la lógica y del bucle; las de navegador van con Playwright.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
