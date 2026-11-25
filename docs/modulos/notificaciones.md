# Notificaciones

`src/notificaciones/` · Ruta base `api/notificaciones` · [← Índice](./README.md)

Avisos del panel **calculados al momento** con el estado real de la BD. No hay tabla propia: un aviso desaparece solo
cuando se resuelve lo que lo causa.

## Endpoint

| Método | Ruta                  | Acceso                  | Descripción                                            |
| ------ | --------------------- | ----------------------- | ------------------------------------------------------ |
| GET    | `/api/notificaciones` | sesión (`@Autorizar()`) | `{ total, notificaciones[] }`, filtradas por permisos. |

`total` = suma de `cantidad` de todos los avisos. Cada `Notificacion`: `{ tipo, titulo, detalle, cantidad, href, desde }`.

## Avisos y permiso que los habilita

| Tipo                       | Permiso requerido | Condición                                                                | `href` (panel)                      |
| -------------------------- | ----------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| `pedidos_nuevos`           | `pedidos.ver`     | pedidos `pendiente` (`desde` = el más antiguo)                           | `/admin/pedidos?estado=pendiente`   |
| `comprobantes_por_revisar` | `pedidos.ver`     | `transferencia`, estado `pendiente`/`confirmado`, con comprobante subido | `/admin/pedidos`                    |
| `pedidos_listos`           | `pedidos.ver`     | pedidos `listo` esperando al cliente                                     | `/admin/pedidos?estado=listo`       |
| `productos_agotados`       | `inventario.ver`  | `stock = 0`                                                              | `/admin/inventario?filtro=agotados` |
| `stock_bajo`               | `inventario.ver`  | `0 < stock <= stock_minimo`                                              | `/admin/inventario?filtro=pocos`    |

`detalle` lista hasta 3 nombres y «y N más». Productos limitados a 500 filas, del más escaso al menos escaso.

## Implementación

`NotificacionesService` usa `DataSource.query` con **SQL crudo** (una consulta de conteos con `FILTER` para pedidos y otra
para productos), así que depende de nombres de columnas reales (`estado`, `metodo_pago`, `comprobante_pago_url`,
`created_at`, `stock`, `stock_minimo`).

## Relaciones

- [pedidos](./pedidos.md) y [productos](./productos.md): sus tablas se leen directo; si renombras columnas, actualiza el SQL.
- [auth](./auth.md): usa `actor.permisos` para decidir qué secciones calcula.
- Las rutas `href` pertenecen al frontend (`Variedades-ByJ-2.0-web`).

## Historial de cambios

- `feat(api)` Notificaciones del panel y stock mínimo por producto (PR #22).
