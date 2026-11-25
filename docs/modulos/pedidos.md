# Pedidos y ventas del sistema

`src/pedidos/` · Rutas `api/pedidos` y `api/ventas-sistema` · [← Índice](./README.md)

Un **pedido** es la compra de un cliente en la tienda en línea o una venta de mostrador. Cuando llega a `entregado` pasa
a ser una **venta del sistema** y recibe número de comprobante. **No confundir** con [ventas](./ventas.md) (`api/ventas`),
que es el cierre diario de caja.

## Archivos

`pedidos.controller.ts` (cliente + personal), `ventas-sistema.controller.ts`, `pedidos.service.ts` (toda la lógica),
`pedido.entity.ts`, `pedido-item.entity.ts`, `pedido.constantes.ts` (estados, canales, transiciones, límites),
`precios.ts` (descuento, códigos, parseo de búsquedas), `dtos/`.

## Estados y transiciones

```
pendiente → confirmado → listo → entregado   (final)
    └──────────┴──────────┴────→ cancelado   (final)
```

`TRANSICIONES` en `pedido.constantes.ts`. Entregado y cancelado son finales; transición inválida → 409.
Canales: `web`, `mostrador`. Métodos de pago: `efectivo`, `transferencia`.

## Endpoints — cliente (cualquier sesión, solo sus pedidos: `@Autorizar()`)

| Método | Ruta                                | Descripción                                                                                                                       |
| ------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/pedidos`                      | Crea pedido `pendiente`. Cuerpo `{ items:[{productoId,cantidad}], metodoPago, nota? }`.                                           |
| GET    | `/api/pedidos/mios`                 | Mis pedidos (últimos 100).                                                                                                        |
| GET    | `/api/pedidos/mios/:id`             | Uno mío (ajeno = 404, igual que inexistente).                                                                                     |
| PATCH  | `/api/pedidos/mios/:id/cancelar`    | Solo si sigue `pendiente`; si no, 409.                                                                                            |
| POST   | `/api/pedidos/mios/:id/comprobante` | `multipart`, campo `comprobante` (1 imagen o PDF). Solo `transferencia` y estado `pendiente`/`confirmado`. Reemplaza el anterior. |

## Endpoints — personal

| Método | Ruta                      | Permiso              | Descripción                                                                                                                |
| ------ | ------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/pedidos`            | `pedidos.ver`        | Lista paginada. Filtros `estado`, `q` (`PED-12`/`12` o nombre), `pagina`, `limite`.                                        |
| GET    | `/api/pedidos/:id`        | `pedidos.ver`        | Detalle.                                                                                                                   |
| PATCH  | `/api/pedidos/:id/estado` | `pedidos.gestionar`  | `{ estado }` siguiendo `TRANSICIONES`.                                                                                     |
| GET    | `/api/ventas-sistema`     | `ventas.ver`         | Pedidos `entregado`. Filtros `canal`, `q` (`CV-12`, `PED-12` o nombre). Devuelve además `monto` (suma).                    |
| POST   | `/api/ventas-sistema`     | `ventas.registrar`   | Venta de mostrador: nace `entregada`. Opcionales `clienteNombre` (def. «Cliente de mostrador»), `clienteTelefono`, `nota`. |
| GET    | `/api/ventas-sistema/:id` | `ventas.comprobante` | Venta con lo del comprobante; 404 si no está entregada.                                                                    |

## Reglas de negocio

- **Precios y total los calcula el servidor** con el catálogo (`precioConDescuento`); el cliente nunca los envía. Se **copian**
  al pedido (`nombre`, `precio_unidad`, `subtotal`): cambios posteriores del catálogo no alteran lo vendido.
- Líneas repetidas del mismo producto se suman. Máx. 30 líneas y 99 unidades por línea; total ≤ 2.000.000.000.
- **Stock**: se descuenta al crear (pedido web y mostrador) en la **misma transacción** con `UPDATE ... WHERE stock >= cantidad`;
  si falta de un producto no se crea ni descuenta nada (409 con el nombre y lo que queda). Al **cancelar** se devuelve
  (`LEAST(stock + cantidad, STOCK_MAXIMO)`), omitiendo líneas cuyo producto ya no existe.
- **Entregar** asigna `entregado_en` y `numero_comprobante = nextval('comprobante_numero_seq')`. Código visible: `CV-000012`;
  pedido: `PED-0012`.
- **Concurrencia**: el cambio de estado hace `UPDATE ... WHERE id AND estado = <anterior>`; si otro lo cambió → 409
  «El pedido cambió mientras lo editabas».
- Búsqueda: `idDesdeNumero` y `comprobanteDesdeCodigo` interpretan códigos; si no, `ILIKE` sobre el nombre (con escape de `% _ \`).
- Comprobante de pago: se sube a Cloudinary; si la BD falla se borra lo subido; el anterior se borra tras guardar.

## Respuesta (`aRespuesta`)

`{ id, numero, estado, canal, metodoPago, nota, total, cliente:{id,nombre,telefono}, items[], comprobantePago:{url}|null,
comprobante:"CV-…"|null, createdAt, entregadoEn, canceladoEn }`. No expone el `publicId` del comprobante de pago.

## Modelo de datos

`pedidos` (`usuario_id` nullable `SET NULL`, datos del cliente copiados, `canal`, `estado`, `metodo_pago`, `total`,
`comprobante_pago_*`, `numero_comprobante` único, `entregado_en`, `cancelado_en`; índices usuario/estado/created_at;
CHECKs de estado/canal/método/total) y `pedido_items` (`pedido_id` CASCADE, `producto_id` nullable `SET NULL`, cantidad > 0).
Secuencia `comprobante_numero_seq`. Ver [base de datos](./base-de-datos.md).

## Relaciones

- [productos](./productos.md): lee precio/descuento y modifica `stock` directamente; importa `STOCK_MAXIMO`.
- [auth](./auth.md): `Usuario` (datos del cliente) y permisos.
- [files-cloudinary](./files-cloudinary.md): comprobante de transferencia (`interceptorArchivos("comprobante")`).
- [notificaciones](./notificaciones.md): cuenta pedidos `pendiente`/`listo` y comprobantes por revisar con SQL crudo
  sobre las columnas `estado`, `metodo_pago`, `comprobante_pago_url`, `created_at`.
- [configuracion](./configuracion.md): `cuentaTransferencia` es lo que ve el cliente para pagar.
- Ventas del sistema **no** se mezclan con [ventas](./ventas.md) ni entran hoy en [reportes](./reportes.md) (que usan el cierre diario).

## Trampas

- `ventas.anular` existe como permiso pero **no hay endpoint** de anulación todavía.
- Si renombras columnas de `pedidos`, actualiza el SQL de [notificaciones](./notificaciones.md).

## Historial de cambios

- Módulo creado con la migración `CreatePedidos`: pedidos web, ventas de mostrador y comprobantes `CV-`.
