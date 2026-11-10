// Pagos con dinero (K1, Anexo I con impacto §5): solo la interfaz, una
// implementación que no ofrece nada (`pagosNulos`, la de la web) y una
// simulada para las pruebas y la compilación de demostración
// (`pagosSimulados`), sin SDK, sin red y sin proveedor. Con `pagosNulos` no se
// ve ningún botón de compra con dinero (R12). Lo que da cada producto y la
// acreditación sin duplicados están en `src/logica/tienda.ts`.
import type { ProductoId } from "../logica/tienda.ts";

/** Producto a la venta según el proveedor: precio en céntimos y su moneda (impacto, K1: para el «≈ X,XX €»). */
export type ProductoPago = { id: ProductoId; centimos: number; moneda: string; texto: string };

export type ResultadoPago = { estado: "pagado"; transaccion: string } | { estado: "cancelado" | "error" | "pendiente" };

export interface Pagos {
  /** ¿Hay proveedor de pagos? Si no, la Tienda no enseña nada que se pague con dinero. */
  disponible(): boolean;
  productos(): ProductoPago[];
  comprar(id: ProductoId): Promise<ResultadoPago>;
}

/** Sin pagos: nada disponible, sin productos y toda compra se cancela. */
export const pagosNulos: Pagos = {
  disponible: () => false,
  productos: () => [],
  comprar: () => Promise.resolve({ estado: "cancelado" }),
};

/**
 * Pagos de la compilación según `PUBLIC_PLATAFORMA`. Solo existe `web` (o
 * nada), sin pagos; un proveedor tendría aquí su adaptador (tienda-y-pagos.md,
 * apartado 7). La demostración no pasa por aquí: se elige con
 * `import.meta.env.MODE` en `principal.ts`, para que no llegue a `dist/` (R14).
 */
export function pagosDePlataforma(_plataforma: string | undefined): Pagos {
  return pagosNulos;
}

/** Precios de prueba de la simulación (los de verdad los decide el usuario al activar los pagos). */
export const PRODUCTOS_SIMULADOS: readonly ProductoPago[] = [
  { id: "monedas-1000", centimos: 199, moneda: "EUR", texto: "1.000 monedas" },
  { id: "monedas-3000", centimos: 499, moneda: "EUR", texto: "3.000 monedas" },
  { id: "monedas-8000", centimos: 999, moneda: "EUR", texto: "8.000 monedas" },
  { id: "pack-ayudas", centimos: 299, moneda: "EUR", texto: "Pack de ayudas: 3 de cada objeto" },
];

/**
 * Pagos simulados: `confirmar` decide el resultado de cada compra (en las
 * pruebas, uno fijo; en la demostración, una capa con «Pagar» y «Cancelar»).
 * Con «pagado», cada compra lleva una transacción nueva y única.
 */
export function pagosSimulados(confirmar: (producto: ProductoPago) => Promise<ResultadoPago["estado"]> = () => Promise.resolve("pagado")): Pagos {
  let cuenta = 0;
  return {
    disponible: () => true,
    productos: () => [...PRODUCTOS_SIMULADOS],
    comprar: async (id) => {
      const producto = PRODUCTOS_SIMULADOS.find((p) => p.id === id);
      if (!producto) return { estado: "error" };
      const estado = await confirmar(producto);
      if (estado !== "pagado") return { estado };
      cuenta++;
      return { estado: "pagado", transaccion: `sim-${Date.now().toString(36)}-${cuenta}` };
    },
  };
}
