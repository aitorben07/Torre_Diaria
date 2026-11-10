// Productos de dinero y su acreditación (K1, Anexo I con impacto §5, R-8):
// tres paquetes de monedas y un «Pack de ayudas» repetible. Funciones puras
// sobre el progreso: la página las aplica con `Guardado.cambiar` después de
// que el proveedor de pagos (`src/juego/pagos.ts`) diga «pagado». Los precios
// en dinero no están aquí: los da el proveedor, en céntimos.
import { MAX_OBJETO, MAX_TRANSACCIONES, OBJETOS, type Progreso } from "./progreso.ts";
import { objetoPorId } from "./objetos.ts";

export const PRODUCTOS_IDS = ["monedas-1000", "monedas-3000", "monedas-8000", "pack-ayudas"] as const;
export type ProductoId = (typeof PRODUCTOS_IDS)[number];

export type Producto = {
  id: ProductoId;
  /** Monedas que da. */
  monedas: number;
  /** Unidades de cada objeto de ayuda que da. */
  objetos: number;
};

/** Unidades de cada objeto del «Pack de ayudas». */
export const UNIDADES_PACK = 3;

export const PRODUCTOS: readonly Producto[] = [
  { id: "monedas-1000", monedas: 1000, objetos: 0 },
  { id: "monedas-3000", monedas: 3000, objetos: 0 },
  { id: "monedas-8000", monedas: 8000, objetos: 0 },
  { id: "pack-ayudas", monedas: 0, objetos: UNIDADES_PACK },
];

export function esProducto(id: string): id is ProductoId {
  return (PRODUCTOS_IDS as readonly string[]).includes(id);
}

export function productoPorId(id: ProductoId): Producto {
  return PRODUCTOS.find((p) => p.id === id)!;
}

/**
 * ¿Se puede ofrecer el producto? Los paquetes de monedas, siempre. El pack,
 * solo si con él ningún objeto pasa de `MAX_OBJETO`: lo pagado nunca se
 * recorta (impacto, K1). Con 7 relojes, no.
 */
export function productoDisponible(p: Progreso, id: ProductoId): boolean {
  const producto = productoPorId(id);
  return OBJETOS.every((o) => p.objetos[o] + producto.objetos <= MAX_OBJETO);
}

export function yaAcreditada(p: Progreso, transaccion: string): boolean {
  return p.compras.transacciones.some((t) => t.id === transaccion);
}

/**
 * Acredita una compra pagada: suma lo del producto y apunta la transacción con
 * su producto, sus monedas y la fecha (`ahora`, en ms), como mucho las
 * `MAX_TRANSACCIONES` últimas. La misma transacción no se acredita dos veces.
 * Si dos pestañas compraron a la vez y una unidad del pack ya no cabe, esa
 * unidad se paga en monedas a su precio de la tienda: nada pagado se pierde.
 */
export function acreditarCompra(p: Progreso, id: ProductoId, transaccion: string, ahora: number): Progreso {
  if (yaAcreditada(p, transaccion)) return p;
  const producto = productoPorId(id);
  let monedas = p.monedas + producto.monedas;
  const objetos = { ...p.objetos };
  if (producto.objetos > 0) {
    for (const o of OBJETOS) {
      const caben = Math.min(producto.objetos, MAX_OBJETO - objetos[o]);
      objetos[o] += caben;
      monedas += (producto.objetos - caben) * objetoPorId(o).precio;
    }
    // Un objeto comprado ya está a mano aunque aún no tocara por partidas.
    objetos.desbloqueados = [...new Set([...p.objetos.desbloqueados, ...OBJETOS])];
  }
  // Las monedas de la transacción, las acreditadas de verdad (con las del pack que no cupo).
  const nueva = { id: transaccion, producto: id, monedas: monedas - p.monedas, fecha: ahora };
  return {
    ...p,
    monedas,
    objetos,
    compras: { transacciones: [...p.compras.transacciones, nueva].slice(-MAX_TRANSACCIONES) },
  };
}

/**
 * Céntimos por moneda para el «≈ X,XX €» junto a los precios en monedas
 * (impacto, J1): los del paquete más pequeño, que es el más caro por moneda,
 * así la cifra nunca se queda corta. Sin ese paquete en la lista, `null`.
 */
export function centimosPorMoneda(productos: ReadonlyArray<{ id: string; centimos: number }>): number | null {
  const base = productos.find((p) => p.id === "monedas-1000");
  return base ? base.centimos / productoPorId("monedas-1000").monedas : null;
}

/** Dinero en céntimos como texto: `24` da «0,24 €». */
export function textoEuros(centimos: number): string {
  const redondo = Math.round(centimos);
  return `${Math.floor(redondo / 100)},${String(redondo % 100).padStart(2, "0")} €`;
}
