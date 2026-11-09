import { defineConfig, devices } from "@playwright/test";

const PUERTO = 4329;
const ESCRITORIO = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
const MOVIL = { ...devices["Pixel 7"] };

// Dos proyectos de Chromium para `npm run e2e` (D12), dos de rendimiento que
// corren después y de uno en uno (miden tiempos: con otras pruebas a la vez, la
// carga del equipo los falsea) y dos de otros motores solo para la prueba
// informativa de `npm run e2e:motores` (T10). Dos hilos: cada prueba juega una
// partida en tiempo real y con más a la vez se retrasan los fotogramas.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 2,
  // Cada prueba juega partidas en tiempo real: si el equipo va cargado, el
  // juego va más lento (como mucho 5 pasos por fotograma) y 30 s no bastan.
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
  },
  webServer: {
    command: `npm run build && npx astro preview --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "escritorio",
      testIgnore: /motores\.spec\.ts|rendimiento\.spec\.ts/,
      use: ESCRITORIO,
    },
    {
      name: "movil",
      testIgnore: /motores\.spec\.ts|rendimiento\.spec\.ts/,
      use: MOVIL,
    },
    {
      name: "rendimiento-escritorio",
      testMatch: /rendimiento\.spec\.ts/,
      dependencies: ["escritorio", "movil"],
      use: ESCRITORIO,
    },
    {
      name: "rendimiento-movil",
      testMatch: /rendimiento\.spec\.ts/,
      dependencies: ["rendimiento-escritorio"],
      use: MOVIL,
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
