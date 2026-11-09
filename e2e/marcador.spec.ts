// A1 (tercera versión): los puntos del HUD y del fin caben desde 1.000 hasta
// 999.999 en todas las pantallas, con combo, récord y meta a la vista y el
// hueco del botón de pausa (E3) ya reservado. Solo maquetación: va en escritorio (R17).
import { expect, test, type Page } from "@playwright/test";
import { conTactil, esperarFinListo, esperarLibre, juego, jugarHastaElFin, preparar } from "./ayudas.ts";

const PANTALLAS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
  { width: 1280, height: 600 },
];
const PUNTOS = ["999", "1.000", "12.345", "999.999"];

/** El escalón de letra que pone `pintarHud` (misma regla que `escalonCifras`, probada con Vitest). */
const escalon = (texto: string) => (texto.length >= 7 ? "cifras-7" : texto.length === 6 ? "cifras-6" : texto.length === 5 ? "cifras-5" : null);

type Caja = { left: number; right: number; top: number; bottom: number };
const cruzan = (a: Caja, b: Caja) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Escribe puntos, combo, récord y meta en el HUD y devuelve las cajas que hay que comparar. */
async function medirHud(page: Page, texto: string) {
  return page.evaluate(
    ([puntos, clase]) => {
      const caja = (el: Element) => el.getBoundingClientRect().toJSON() as Caja;
      const hud = document.getElementById("hud")!;
      if (!hud.querySelector(".hud-pausa")) {
        // Hueco del botón de pausa de E3 (44×44 px): la prueba lo reserva ya.
        const hueco = document.createElement("span");
        hueco.className = "hud-pausa";
        hud.append(hueco);
      }
      const numero = document.getElementById("hud-puntos")!;
      numero.textContent = puntos;
      numero.classList.remove("cifras-5", "cifras-6", "cifras-7");
      if (clase) numero.classList.add(clase);
      const textos: Record<string, string> = { combo: "Combo ×12", record: "Récord 999.999", "hud-meta": "Meta: 10 m en 18" };
      for (const [id, valor] of Object.entries(textos)) {
        const el = document.getElementById(id)!;
        el.textContent = valor;
        el.hidden = false;
      }
      const lado = [...document.querySelectorAll(".lado > p")];
      return {
        hud: caja(hud),
        numero: caja(numero),
        anchoTexto: numero.scrollWidth,
        anchoPegatina: numero.clientWidth,
        letra: parseFloat(getComputedStyle(numero).fontSize),
        vidas: caja(document.getElementById("vidas")!),
        pausa: caja(hud.querySelector(".hud-pausa")!),
        lado: lado.map((el) => ({ caja: caja(el), cabe: el.scrollWidth <= el.clientWidth })),
        documento: document.documentElement.scrollWidth,
        ventana: window.innerWidth,
      };
    },
    [texto, escalon(texto)] as const,
  );
}

for (const pantalla of PANTALLAS) {
  test(`en ${pantalla.width}×${pantalla.height} los puntos de 999 a 999.999 caben en el HUD`, async ({ page }, testInfo) => {
    test.skip(conTactil(testInfo), "Solo maquetación: basta con escritorio");
    await page.setViewportSize(pantalla);
    await preparar(page);
    await page.goto("/");
    await esperarLibre(page);
    for (const texto of PUNTOS) {
      const m = await medirHud(page, texto);
      const caso = `${texto} en ${pantalla.width}×${pantalla.height}`;
      expect(m.anchoTexto, `número dentro de la pegatina: ${caso}`).toBeLessThanOrEqual(m.anchoPegatina);
      expect(m.numero.left, `pegatina dentro del HUD: ${caso}`).toBeGreaterThanOrEqual(m.hud.left);
      expect(m.numero.right, `pegatina dentro del HUD: ${caso}`).toBeLessThanOrEqual(m.hud.right);
      expect(cruzan(m.numero, m.vidas), `número y vidas: ${caso}`).toBe(false);
      expect(cruzan(m.numero, m.pausa), `número y pausa: ${caso}`).toBe(false);
      expect(m.pausa.right - m.pausa.left, `hueco de pausa: ${caso}`).toBeGreaterThanOrEqual(44);
      expect(m.pausa.right, `hueco de pausa dentro del HUD: ${caso}`).toBeLessThanOrEqual(m.hud.right);
      for (const [i, lado] of m.lado.entries()) {
        expect(lado.cabe, `texto ${i} de .lado entero: ${caso}`).toBe(true);
        expect(lado.caja.left, `texto ${i} de .lado dentro del HUD: ${caso}`).toBeGreaterThanOrEqual(m.hud.left);
        expect(lado.caja.right, `texto ${i} de .lado dentro del HUD: ${caso}`).toBeLessThanOrEqual(m.hud.right);
        expect(cruzan(m.numero, lado.caja), `número y texto ${i} de .lado: ${caso}`).toBe(false);
        expect(cruzan(m.vidas, lado.caja), `vidas y texto ${i} de .lado: ${caso}`).toBe(false);
        expect(cruzan(m.pausa, lado.caja), `pausa y texto ${i} de .lado: ${caso}`).toBe(false);
      }
      if (texto === "999.999") expect(m.letra, `letra de ${caso}`).toBeGreaterThanOrEqual(24);
      expect(m.documento, `sin desplazamiento horizontal: ${caso}`).toBeLessThanOrEqual(m.ventana);
    }
  });
}

test("en 320×568 «999.999 puntos» cabe en el fin y el saldo de monedas, en su cabecera", async ({ page }, testInfo) => {
  test.skip(conTactil(testInfo), "Solo maquetación: basta con escritorio");
  await page.setViewportSize({ width: 320, height: 568 });
  await preparar(page);
  await page.goto("/");
  await esperarLibre(page);
  await jugarHastaElFin(page, false);
  // El fin ignora toques y clics los primeros 700 ms.
  await esperarFinListo(page);
  const m = await page.evaluate((clase) => {
    const numero = document.getElementById("fin-numero")!;
    numero.textContent = "999.999";
    numero.classList.remove("cifras-5", "cifras-6", "cifras-7");
    numero.classList.add(clase);
    document.getElementById("fin-unidad")!.textContent = "puntos";
    const fin = document.getElementById("fin")!;
    const marcador = fin.querySelector(".marcador")!;
    return {
      panel: { scroll: fin.scrollWidth, cliente: fin.clientWidth },
      marcador: { derecha: marcador.getBoundingClientRect().right, panel: fin.getBoundingClientRect().right },
      documento: document.documentElement.scrollWidth,
    };
  }, escalon("999.999")!);
  expect(m.panel.scroll).toBeLessThanOrEqual(m.panel.cliente);
  expect(m.marcador.derecha).toBeLessThanOrEqual(m.marcador.panel);
  expect(m.documento).toBeLessThanOrEqual(320);

  await page.getByRole("button", { name: /^Colección/ }).click();
  await expect(juego(page)).toHaveAttribute("data-estado", "coleccion");
  const saldo = await page.evaluate(() => {
    document.getElementById("coleccion-monedas")!.textContent = "999.999";
    const panel = document.getElementById("coleccion")!;
    const cabecera = panel.querySelector(".cabecera")!;
    return { scroll: panel.scrollWidth, cliente: panel.clientWidth, cabecera: cabecera.scrollWidth <= cabecera.clientWidth };
  });
  expect(saldo.scroll).toBeLessThanOrEqual(saldo.cliente);
  expect(saldo.cabecera).toBe(true);
});
