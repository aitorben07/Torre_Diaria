import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pagosDePlataforma, pagosNulos, pagosSimulados } from "../juego/pagos.ts";
import { objetoPorId } from "./objetos.ts";
import { MAX_OBJETO, MAX_TRANSACCIONES, normalizar, progresoVacio, type Progreso } from "./progreso.ts";
import { acreditarCompra, centimosPorMoneda, PRODUCTOS_IDS, productoDisponible, textoEuros, UNIDADES_PACK } from "./tienda.ts";

const AHORA = Date.UTC(2026, 10, 10, 12);

const con = (objetos: Partial<Progreso["objetos"]> = {}, monedas = 0): Progreso => {
  const p = progresoVacio();
  return { ...p, monedas, objetos: { ...p.objetos, ...objetos } };
};

/** Lo que haría la página: comprar con el proveedor y, solo con «pagado», acreditar. */
async function comprarCon(p: Progreso, estado: "pagado" | "cancelado" | "error" | "pendiente"): Promise<Progreso> {
  const resultado = await pagosSimulados(() => Promise.resolve(estado)).comprar("monedas-1000");
  return resultado.estado === "pagado" ? acreditarCompra(p, "monedas-1000", resultado.transaccion, AHORA) : p;
}

describe("acreditar compras (K1)", () => {
  it("acreditar la misma transacción dos veces suma una sola vez", () => {
    const una = acreditarCompra(con({}, 50), "monedas-1000", "tx-1", AHORA);
    expect(una.monedas).toBe(1050);
    expect(una.compras.transacciones).toEqual([{ id: "tx-1", producto: "monedas-1000", monedas: 1000, fecha: AHORA }]);
    expect(acreditarCompra(una, "monedas-1000", "tx-1", AHORA + 1)).toBe(una);
    expect(acreditarCompra(una, "monedas-3000", "tx-2", AHORA).monedas).toBe(4050);
  });

  it("la acreditación sobrevive a guardar y releer: la misma transacción no vuelve a sumar", () => {
    const una = acreditarCompra(progresoVacio(), "monedas-8000", "tx-8", AHORA);
    const releida = normalizar(JSON.parse(JSON.stringify(una)))!;
    expect(acreditarCompra(releida, "monedas-8000", "tx-8", AHORA).monedas).toBe(8000);
  });

  it("con cancelado, error o pendiente no se acredita nada; con pagado, sí", async () => {
    for (const estado of ["cancelado", "error", "pendiente"] as const) {
      const p = con({}, 10);
      const despues = await comprarCon(p, estado);
      expect(despues, estado).toBe(p);
      expect(despues.compras.transacciones).toEqual([]);
    }
    expect((await comprarCon(con({}, 10), "pagado")).monedas).toBe(1010);
  });

  it("dos compras simuladas tienen transacciones distintas y suman las dos", async () => {
    const pagos = pagosSimulados();
    let p = progresoVacio();
    for (let i = 0; i < 2; i++) {
      const r = await pagos.comprar("monedas-1000");
      if (r.estado === "pagado") p = acreditarCompra(p, "monedas-1000", r.transaccion, AHORA);
    }
    expect(p.monedas).toBe(2000);
    expect(new Set(p.compras.transacciones.map((t) => t.id)).size).toBe(2);
  });

  it("guarda las 50 últimas transacciones", () => {
    let p = progresoVacio();
    for (let i = 0; i < MAX_TRANSACCIONES + 5; i++) p = acreditarCompra(p, "monedas-1000", `tx-${i}`, AHORA + i);
    expect(p.compras.transacciones).toHaveLength(MAX_TRANSACCIONES);
    expect(p.compras.transacciones[0]!.id).toBe("tx-5");
    expect(p.monedas).toBe(1000 * (MAX_TRANSACCIONES + 5));
  });

  it("el pack da 3 de cada objeto, se puede repetir, apunta 0 monedas y deja los objetos a mano", () => {
    let p = acreditarCompra(con({ reloj: 1 }), "pack-ayudas", "tx-a", AHORA);
    expect(p.objetos).toMatchObject({ reloj: 1 + UNIDADES_PACK, cemento: UNIDADES_PACK, corazon: UNIDADES_PACK });
    expect(p.objetos.desbloqueados).toEqual(["reloj", "cemento", "corazon"]);
    expect(p.compras.transacciones[0]).toMatchObject({ producto: "pack-ayudas", monedas: 0 });
    p = acreditarCompra(p, "pack-ayudas", "tx-b", AHORA);
    expect(p.objetos.cemento).toBe(2 * UNIDADES_PACK);
  });

  it("con 7 relojes, pack-ayudas no está disponible; con 6, sí; los paquetes de monedas, siempre", () => {
    expect(productoDisponible(con({ reloj: 7 }), "pack-ayudas")).toBe(false);
    expect(productoDisponible(con({ corazon: 8 }), "pack-ayudas")).toBe(false);
    expect(productoDisponible(con({ reloj: 6, cemento: 6, corazon: 6 }), "pack-ayudas")).toBe(true);
    for (const id of ["monedas-1000", "monedas-3000", "monedas-8000"] as const) expect(productoDisponible(con({ reloj: 9, cemento: 9, corazon: 9 }), id)).toBe(true);
  });

  it("lo pagado nunca se recorta: si el pack ya no cabe (otra pestaña compró), lo que sobra se paga en monedas", () => {
    const p = acreditarCompra(con({ reloj: 8, cemento: 9, corazon: 0 }), "pack-ayudas", "tx-c", AHORA);
    expect(p.objetos).toMatchObject({ reloj: MAX_OBJETO, cemento: MAX_OBJETO, corazon: 3 });
    expect(p.monedas).toBe(2 * objetoPorId("reloj").precio + 3 * objetoPorId("cemento").precio);
    // La transacción guarda las monedas acreditadas de verdad, no las del producto (0).
    expect(p.compras.transacciones.at(-1)).toMatchObject({ id: "tx-c", producto: "pack-ayudas", monedas: p.monedas });
    expect(acreditarCompra(con({ reloj: 0, cemento: 0, corazon: 0 }), "pack-ayudas", "tx-d", AHORA).compras.transacciones.at(-1)!.monedas).toBe(0);
  });
});

describe("proveedor de pagos (K1)", () => {
  it("pagosDePlataforma(undefined) y pagosDePlataforma(«web») devuelven pagosNulos, que no ofrece nada", async () => {
    expect(pagosDePlataforma(undefined)).toBe(pagosNulos);
    expect(pagosDePlataforma("web")).toBe(pagosNulos);
    expect(pagosNulos.disponible()).toBe(false);
    expect(pagosNulos.productos()).toEqual([]);
    await expect(pagosNulos.comprar("monedas-1000")).resolves.toEqual({ estado: "cancelado" });
  });

  it("los productos simulados dan precio en céntimos y moneda, y son los cuatro ids del catálogo", () => {
    const productos = pagosSimulados().productos();
    expect(productos.map((p) => p.id)).toEqual([...PRODUCTOS_IDS]);
    for (const p of productos) {
      expect(Number.isInteger(p.centimos) && p.centimos > 0).toBe(true);
      expect(p.moneda).toBe("EUR");
    }
  });

  it("el equivalente en euros usa el paquete más pequeño: 120 monedas a 1,99 € las 1.000 son 0,24 €", () => {
    const porMoneda = centimosPorMoneda(pagosSimulados().productos())!;
    expect(textoEuros(120 * porMoneda)).toBe("0,24 €");
    expect(textoEuros(1999)).toBe("19,99 €");
    expect(textoEuros(5)).toBe("0,05 €");
    expect(centimosPorMoneda([])).toBeNull();
  });

  it("ningún archivo de src/ nombra proveedores de pago (stripe, paypal, billing)", () => {
    const raiz = new URL("../", import.meta.url);
    const archivos = (readdirSync(raiz, { recursive: true }) as string[]).filter((ruta) => /\.(ts|astro|css)$/.test(ruta) && !ruta.endsWith(".test.ts"));
    expect(archivos.length).toBeGreaterThan(5);
    expect(archivos.filter((ruta) => /stripe|paypal|billing/i.test(readFileSync(new URL(ruta.replaceAll("\\", "/"), raiz), "utf8")))).toEqual([]);
  });
});
