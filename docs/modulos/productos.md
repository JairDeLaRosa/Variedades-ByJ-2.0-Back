# Productos

`src/productos/` · Ruta base `api/productos` · [← Índice](./README.md)

Catálogo de la tienda: productos con fotos, precio, stock, stock mínimo y descuento.

## Endpoints

| Método | Ruta                       | Acceso               | Descripción                                                 |
| ------ | -------------------------- | -------------------- | ----------------------------------------------------------- |
| GET    | `/api/productos`           | **público**          | Lista (más nuevos primero). Filtro opcional `?categoria=`.  |
| GET    | `/api/productos/:id`       | **público**          | Un producto; 404 si no existe.                              |
| POST   | `/api/productos`           | `productos.crear`    | `multipart/form-data`: campos + fotos nuevas en `imagenes`. |
| PUT    | `/api/productos/:id`       | `productos.editar`   | Reemplaza datos y fotos (ver `conservar`).                  |
| PATCH  | `/api/productos/:id/stock` | `inventario.ajustar` | Ajuste de stock `{ modo, cantidad }`.                       |
| DELETE | `/api/productos/:id`       | `productos.eliminar` | 204. Borra también las fotos en Cloudinary.                 |

El catálogo es público porque la tienda lo consulta sin sesión. Los permisos `productos.ver` e `inventario.ver` solo
gobiernan pantallas del panel y las [notificaciones](./notificaciones.md); no protegen `GET`.

## DTOs

- `CreateProductoDto` (crear y editar): `nombre` (≤150), `descripcion` (≤2000), `categoria` (≤100), `precioUnidad` (0–2.000.000.000),
  `stock` (0–1.000.000), `stockMinimo?` (0–1.000.000), `descuento?` (0–100, entero), `conservar?: string[]` (publicIds `docs/...`).
- `AjustarStockDto`: `modo` = `sumar` | `restar` | `fijar`, `cantidad` entero 0–`STOCK_MAXIMO` (1.000.000).

## Reglas de negocio

- **Fotos** (máx. 5, ver [files-cloudinary](./files-cloudinary.md)): crear sube todas o ninguna; si la BD falla se borran
  las recién subidas. Editar: se quedan las de `conservar` (deben pertenecer al producto, si no 400), se suman las nuevas y
  las demás se borran de Cloudinary **después** de guardar.
- **Opcionales omitidos**: `stockMinimo` y `descuento` que no llegan se omiten: al crear toman el default de la BD
  (5 y 0) y al editar se conserva el valor actual.
- **Ajuste de stock** en una sola sentencia `UPDATE` (atómico): sumar exige `stock + cantidad <= STOCK_MAXIMO`; restar exige
  `stock >= cantidad`; fijar pone el valor. Si no afecta filas: 404 si no existe, o 400 con el motivo.
- **Stock bajo** = `0 < stock <= stock_minimo`; **agotado** = `stock = 0` (lo calcula [notificaciones](./notificaciones.md)).
- Foto repetida en otro producto → 409 (`public_id` único).
- Precio con descuento: `precioConDescuento` en [pedidos](./pedidos.md) (`round(precio*(100-descuento)/100)`).

## Modelo de datos

`productos`: `id`, `nombre`, `descripcion`, `categoria` (índice), `precio_unidad`, `stock`, `stock_minimo` (default 5),
`descuento` (default 0), `created_at`, `updated_at`. CHECKs: precio ≥ 0, stock ≥ 0, descuento 0–100, stock_minimo 0–1.000.000.
`producto_imagenes`: `id`, `producto_id` (CASCADE), `public_id` (único), `url`. Las imágenes son `eager`.
Ver [base de datos](./base-de-datos.md).

## Relaciones

- [files-cloudinary](./files-cloudinary.md): subir/borrar fotos y `interceptorArchivos()`.
- [pedidos](./pedidos.md): descuenta y devuelve stock con SQL directo sobre `Producto`, e importa `STOCK_MAXIMO` de aquí.
  Al borrar un producto, `pedido_items.producto_id` pasa a `NULL` pero la línea (nombre y precio copiados) se conserva.
- [notificaciones](./notificaciones.md): lee `productos.stock` y `stock_minimo` con SQL crudo.
- [auth](./auth.md): permisos.

## Trampas

- Si cambias nombres de columna de `productos`, revisa el SQL crudo de [notificaciones](./notificaciones.md).
- En multipart `descuento`/`stock` llegan como texto; el DTO los convierte con `@Type`.

## Historial de cambios

- `feat(api)` Stock mínimo por producto (migración `AddStockMinimoProductos`) y avisos de stock.
- `feat(files)` Fotos subidas en el mismo endpoint de crear/editar.
