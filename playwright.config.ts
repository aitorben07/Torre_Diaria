import { defineConfig, devices } from "@playwright/test";

const PUERTO = 4329;

// Dos proyectos de Chromium para `npm run e2e` (D12) y dos de otros motores
// solo para la prueba informativa de `npm run e2e:motores` (T10).
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
  },
  webServer: {
    command: `npm run build && npx astro preview --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "escritorio",
      testIgnore: /motores\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "movil",
      testIgnore: /motores\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "firefox",
      testMatch: /motores\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: /motores\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
