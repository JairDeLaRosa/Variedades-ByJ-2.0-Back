/** Valor máximo de un pedido; el total es un `integer` de PostgreSQL. */
export const TOTAL_MAXIMO = 2_000_000_000;

/** Precio de una unidad con el descuento (0 a 100 %) aplicado, redondeado al peso. */
export function precioConDescuento(
  precioUnidad: number,
  descuento: number,
): number {
  return Math.round((precioUnidad * (100 - descuento)) / 100);
}

/** Código que ve el cliente: el id del pedido con ceros a la izquierda. */
export const numeroDePedido = (id: number) =>
  `PED-${String(id).padStart(4, "0")}`;

/** Código del comprobante de venta: el consecutivo con ceros a la izquierda. */
export const codigoDeComprobante = (numero: number) =>
  `CV-${String(numero).padStart(6, "0")}`;

/**
 * Si el texto es un número de pedido (`PED-12`, `ped12` o `12`), devuelve su
 * id; si no, `null` (y se busca por nombre).
 */
export function idDesdeNumero(texto: string): number | null {
  const coincidencia = texto.match(/^(?:ped-?)?(\d{1,9})$/i);
  return coincidencia ? Number(coincidencia[1]) : null;
}
