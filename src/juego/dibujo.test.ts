import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  alturaEnPantalla,
  enVista,
  ESPACIO_SOBRE_CIMA,
  MARGEN_BAJO_TARJETA,
  MARGEN_SUELO,
  objetivoCamara,
  ZOOM_ALEJAMIENTO,
  ZOOM_DESDE,
  ZOOM_FIN_MIN,
  zoomObjetivo,
} from "./dibujo.ts";

/** Metros entre el borde inferior de la vista y la cima, con la cámara en `camara`. */
const cimaSobreBorde = (altura: number, camara: number) => altura - camara + MARGEN_SUELO;

// Vista de un móvil de 390×844: unos 18,9 m de alto para 9,2 m de ancho.
const ALTO_MOVIL = 18.9;

describe("objetivoCamara", () => {
  it("con la torre baja deja el suelo abajo del todo", () => {
    expect(objetivoCamara(0, ALTO_MOVIL)).toBe(0);
    expect(objetivoCamara(5, ALTO_MOVIL)).toBe(0);
  });

  it("sigue a la torre: la cima y la pieza que cuelga siempre caben, sin cielo de sobra", () => {
    for (const altura of [14, 20, 45]) {
      const camara = objetivoCamara(altura, ALTO_MOVIL);
      expect(camara).toBeGreaterThan(0);
      expect(cimaSobreBorde(altura, camara)).toBeCloseTo(ALTO_MOVIL - ESPACIO_SOBRE_CIMA, 9);
    }
  });

  it("con la tarjeta de fin, una torre alta sube hasta dejar la cima justo debajo", () => {
    const tapado = 10;
    for (const altura of [8, 14, 30]) {
      const camara = objetivoCamara(altura, ALTO_MOVIL, tapado);
      expect(cimaSobreBorde(altura, camara)).toBeCloseTo(ALTO_MOVIL - tapado - MARGEN_BAJO_TARJETA, 9);
    }
  });

  it("con la tarjeta de fin, una torre baja que ya cabe debajo no mueve el suelo", () => {
    const tapado = 10;
    for (const altura of [0, 2, 6]) {
      expect(objetivoCamara(altura, ALTO_MOVIL, tapado)).toBe(0);
      expect(cimaSobreBorde(altura, 0)).toBeLessThanOrEqual(ALTO_MOVIL - tapado - MARGEN_BAJO_TARJETA);
    }
  });

  it("si la tarjeta tapa casi toda la vista, encuadra como durante la partida", () => {
    expect(objetivoCamara(20, ALTO_MOVIL, ALTO_MOVIL - 1)).toBe(objetivoCamara(20, ALTO_MOVIL));
  });
});

describe("zoomObjetivo", () => {
  it("jugando no aleja hasta 20 m y luego como mucho un 10 %", () => {
    expect(zoomObjetivo(0, false, 18)).toBe(1);
    expect(zoomObjetivo(ZOOM_DESDE, false, 18)).toBe(1);
    expect(zoomObjetivo(25, false, 18)).toBeCloseTo(0.95, 9);
    expect(zoomObjetivo(200, false, 18)).toBeCloseTo(1 - ZOOM_ALEJAMIENTO, 9);
  });

  it("en el fin aleja lo justo para ver la torre entera bajo la tarjeta, con un tope", () => {
    expect(zoomObjetivo(3, true, 10)).toBe(1);
    const zoom = zoomObjetivo(14, true, 8);
    expect((14 + MARGEN_SUELO + MARGEN_BAJO_TARJETA) * zoom).toBeCloseTo(8, 9);
    expect(zoomObjetivo(500, true, 8)).toBe(ZOOM_FIN_MIN);
  });
});

describe("enVista (recorte de piezas, impacto A2)", () => {
  const pieza = { ancho: 1, alto: 1 };
  it("dibuja las piezas cuya caja toca la franja visible y no las demás", () => {
    expect(enVista({ pieza, y: 5 }, 0, 10)).toBe(true);
    expect(enVista({ pieza, y: 10.6 }, 0, 10)).toBe(true);
    expect(enVista({ pieza, y: -0.6 }, 0, 10)).toBe(true);
    expect(enVista({ pieza, y: 12 }, 0, 10)).toBe(false);
    expect(enVista({ pieza, y: -2 }, 0, 10)).toBe(false);
  });
});

describe("línea de récord (C2)", () => {
  it("queda a la altura guardada: k píxeles por metro sobre la fila de la plataforma", () => {
    expect(alturaEnPantalla(0, 700, 40)).toBe(700);
    expect(alturaEnPantalla(12.5, 700, 40)).toBe(200);
    // Con la cámara subida, la fila de la plataforma baja y la línea con ella.
    expect(alturaEnPantalla(12.5, 900, 40) - alturaEnPantalla(12.5, 700, 40)).toBe(200);
  });
});

describe("coste por fotograma (impacto A2)", () => {
  const fuente = readFileSync(new URL("./dibujo.ts", import.meta.url), "utf8");

  it("no usa sombras difusas, filtros ni modos de fusión", () => {
    expect(fuente).not.toMatch(/shadowBlur|\.filter\s*=|globalCompositeOperation/);
  });

  it("degradados y patrones solo se crean al ajustar (en precalcular y crear…)", () => {
    const metodos = [...fuente.matchAll(/^ {2}(?:private |export )?(?:function )?(\w+)\(/gm)];
    const creaciones = [...fuente.matchAll(/create(?:Linear|Radial|Conic)Gradient|createPattern/g)];
    expect(creaciones.length).toBeGreaterThan(0);
    for (const creacion of creaciones) {
      const metodo = metodos.filter((m) => m.index! < creacion.index!).at(-1)?.[1] ?? "";
      expect(metodo, `${creacion[0]} en ${metodo}`).toMatch(/^(precalcular|crear\w+)$/);
    }
  });
});

describe("el dibujo no toca la partida (A2)", () => {
  const raiz = new URL("./", import.meta.url);
  const archivos = (readdirSync(raiz) as string[]).filter((nombre) => nombre.endsWith(".ts") && !nombre.endsWith(".test.ts"));

  // Que ningún archivo de src/juego/ importe la física ya lo comprueba simulacion.test.ts (T8).
  it("solo principal.ts suelta piezas y avanza la partida; el resto solo lee estado() y tomarEventos()", () => {
    for (const nombre of archivos.filter((n) => n !== "principal.ts")) {
      expect(readFileSync(new URL(nombre, raiz), "utf8"), nombre).not.toMatch(/\.(soltar|paso)\(\)/);
    }
  });

  it("la simulación no conoce temas ni escenarios: cambiar de tema no cambia puntos ni pasos", () => {
    const simulacion = readFileSync(new URL("../logica/simulacion.ts", import.meta.url), "utf8");
    expect(simulacion).not.toMatch(/juego\/|tema|escenario/i);
  });
});
