// T10, prueba informativa (no bloquea): ¿Firefox y WebKit reproducen lo mismo
// que `jugar` en Node (V8)? Solo corre con `npm run e2e:motores`. El resultado
// se anota en el README; es el dato para decidir la validación de D3.
import { expect, test, type Page } from "@playwright/test";
import { jugar } from "../src/logica/simulacion.ts";
import { datosFin, empezarHoy, juego, preparar } from "./ayudas.ts";

const PARTIDAS = 5;
/** Segundos de juego hasta tocar: cerca del centro con las primeras velocidades. */
const RETRASOS = [1.5, 1.6, 1.7, 1.55, 1.65];
const CON_RETRASO = 5;

/** Pasos de simulación por segundo real: el bucle hace como mucho 5 por fotograma. */
async function pasosPorSegundo(page: Page): Promise<number> {
  const fotogramas = await page.evaluate(
    () =>
      new Promise<number>((listo) => {
        let n = 0;
        const contar = () => {
          n++;
          requestAnimationFrame(contar);
        };
        requestAnimationFrame(contar);
        setTimeout(() => listo(n), 2000);
      }),
  );
  return Math.min(60, (fotogramas / 2) * 5);
}

/** Como `jugarHastaElFin`, pero con Espacio y con el retraso en tiempo de juego. */
async function jugarConTeclado(page: Page, retrasoMs: number): Promise<void> {
  for (let pieza = 0; pieza < 200; pieza++) {
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado === "fin" || el.dataset.fase === "apuntando";
    }, undefined, { timeout: 120_000, polling: 100 });
    if ((await juego(page).getAttribute("data-estado")) === "fin") return;
    if (pieza < CON_RETRASO) await page.waitForTimeout(retrasoMs);
    await page.keyboard.press("Space");
    await page.waitForFunction(() => {
      const el = document.getElementById("juego")!;
      return el.dataset.estado === "fin" || el.dataset.fase !== "apuntando";
    }, undefined, { timeout: 120_000, polling: 100 });
  }
}

test("5 partidas en este motor comparadas con jugar() en Node", async ({ page }, testInfo) => {
  test.setTimeout(30 * 60_000);
  await preparar(page);
  await page.goto("/");
  const ritmo = await pasosPorSegundo(page);
  const filas: string[] = [`pasos por segundo: ${ritmo}`];
  let coinciden = 0;
  let mismosPuntos = 0;
  for (let i = 0; i < PARTIDAS; i++) {
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await empezarHoy(page);
    await jugarConTeclado(page, (RETRASOS[i]! * 60 * 1000) / ritmo);
    const fin = await datosFin(page);
    const enNode = jugar(fin.semilla, fin.toques);
    const igual = enNode.puntos === fin.puntos && enNode.altura === fin.altura;
    if (igual) coinciden++;
    if (enNode.puntos === fin.puntos) mismosPuntos++;
    filas.push(
      `partida ${i + 1}: ${fin.toques.length} toques; navegador ${fin.puntos} piezas / ${fin.altura} m; ` +
        `Node ${enNode.puntos} piezas / ${enNode.altura} m; ${igual ? "coincide" : "NO coincide"}`,
    );
  }
  const resumen =
    `${testInfo.project.name}: puntos y altura exactos en ${coinciden} de ${PARTIDAS}; ` +
    `mismos puntos en ${mismosPuntos} de ${PARTIDAS}`;
  testInfo.annotations.push({ type: "motores", description: resumen });
  console.log([resumen, ...filas].join("\n"));
  expect(filas).toHaveLength(PARTIDAS + 1);
});
