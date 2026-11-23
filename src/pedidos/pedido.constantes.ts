export enum EstadoPedido {
  Pendiente = "pendiente",
  Confirmado = "confirmado",
  Listo = "listo",
  Entregado = "entregado",
  Cancelado = "cancelado",
}

/** De dónde viene la venta: la tienda en línea o el vendedor en el mostrador. */
export enum CanalPedido {
  Web = "web",
  Mostrador = "mostrador",
}

export enum MetodoPago {
  Efectivo = "efectivo",
  Transferencia = "transferencia",
}

/**
 * A qué estados puede pasar un pedido desde cada uno. Entregado y cancelado
 * son finales: un pedido entregado es una venta y ya no se toca.
 */
export const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  [EstadoPedido.Pendiente]: [EstadoPedido.Confirmado, EstadoPedido.Cancelado],
  [EstadoPedido.Confirmado]: [EstadoPedido.Listo, EstadoPedido.Cancelado],
  [EstadoPedido.Listo]: [EstadoPedido.Entregado, EstadoPedido.Cancelado],
  [EstadoPedido.Entregado]: [],
  [EstadoPedido.Cancelado]: [],
};

/** Secuencia de PostgreSQL que numera los comprobantes de venta, sin saltos de orden. */
export const SECUENCIA_COMPROBANTE = "comprobante_numero_seq";

export const MAX_ITEMS_POR_PEDIDO = 30;
export const MAX_UNIDADES_POR_ITEM = 99;
