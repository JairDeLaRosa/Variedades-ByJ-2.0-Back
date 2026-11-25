# Base de datos

`src/database/` · [← Índice](./README.md) · ADRs: [0001](../adr/0001-migrar-de-mongodb-a-postgresql.md), [0002](../adr/0002-fechas-como-date-y-timestamptz.md), [0003](../adr/0003-imagenes-en-tablas-hijas.md)

PostgreSQL con TypeORM (Neon en producción). **`synchronize: false`**: el esquema solo cambia con migraciones.

## Conexión

- App (`typeorm.config.ts`): `DATABASE_URL` (con **pooler**), `DB_SSL`, `DB_POOL_MAX` (def. 5), `autoLoadEntities: true`.
- CLI de migraciones (`data-source.ts`): `DATABASE_URL_UNPOOLED` (conexión directa, adecuada para DDL) o, si falta, `DATABASE_URL`.
  Carga `.env.local` y luego `.env`; entidades `src/**/*.entity.ts`, migraciones `src/database/migrations/*.ts`.

## Migraciones (orden)

| Timestamp     | Migración                 | Crea / cambia                                                                                                                                                            |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1763560000000 | `CreateUsuarios`          | `usuarios`.                                                                                                                                                              |
| 1763570000000 | `CreateVentas`            | `ventas` (fecha única, CHECK de montos).                                                                                                                                 |
| 1763580000000 | `CreateSalidas`           | `salidas`, `salida_imagenes`, índices.                                                                                                                                   |
| 1763590000000 | `CreateProductos`         | `productos`, `producto_imagenes`, CHECKs, índice de categoría.                                                                                                           |
| 1763600000000 | `RolesYPermisos`          | `roles`, `rol_permisos`, siembra Administrador/Cliente/Vendedor, `usuarios.rol_id` (reemplaza el flag `admin`).                                                          |
| 1763610000000 | `CreatePedidos`           | secuencia `comprobante_numero_seq`, `pedidos`, `pedido_items`.                                                                                                           |
| 1763620000000 | `CreateConfiguracion`     | `configuracion` (fila única `id = 1`, sembrada).                                                                                                                         |
| 1763630000000 | `AddStockMinimoProductos` | `productos.stock_minimo` (default 5, CHECK 0–1.000.000).                                                                                                                 |
| 1763640000000 | `CreateFacturas`          | `facturas`, `factura_imagenes`, `factura_cuotas`; convierte cada salida en una factura libre pagada; `salidas` gana `factura_id` y `nota` y pierde `factura` y `tienda`. |

Para crear una: skill `database-migrations`. Una migración por propósito; nunca editar una ya aplicada.

## Tablas y módulo dueño

| Tabla                                            | Módulo                              |
| ------------------------------------------------ | ----------------------------------- |
| `usuarios`                                       | [auth](./auth.md)                   |
| `roles`, `rol_permisos`                          | [roles](./roles.md)                 |
| `productos`, `producto_imagenes`                 | [productos](./productos.md)         |
| `pedidos`, `pedido_items`                        | [pedidos](./pedidos.md)             |
| `ventas`                                         | [ventas](./ventas.md)               |
| `salidas`, `salida_imagenes`                     | [salidas](./salidas.md)             |
| `facturas`, `factura_cuotas`, `factura_imagenes` | [facturas](./facturas.md)           |
| `configuracion`                                  | [configuracion](./configuracion.md) |

## Convenciones

- Columnas en `snake_case` en BD y `camelCase` en la entidad (`@Column({ name })`).
- Montos `integer` en pesos; `date` para días de negocio; `timestamptz` para instantes ([ADR 0002](../adr/0002-fechas-como-date-y-timestamptz.md)).
- Imágenes en tablas hijas con `public_id` **único** ([ADR 0003](../adr/0003-imagenes-en-tablas-hijas.md)).
- Reglas críticas protegidas también en BD (CHECKs, únicos): la app traduce `23505` a 409.
- Borrados: hijos `CASCADE` (imágenes, ítems, permisos); referencias que deben sobrevivir `SET NULL` (`pedidos.usuario_id`,
  `pedido_items.producto_id`); roles en uso `RESTRICT`.

## Trampas

- El SQL crudo de [notificaciones](./notificaciones.md) y la secuencia de [pedidos](./pedidos.md) dependen de nombres exactos.
- `numeric` llega como texto desde Postgres: usar `transformer` (ver `interes_porcentaje` en [facturas](./facturas.md)).

## Historial de cambios

- Migraciones iniciales (usuarios → stock mínimo) listadas arriba.
- Migración `CreateFacturas`: tablas de facturas, soportes y cuotas; `salidas` pasa a `factura_id` + `nota`. Sin aplicar todavía en `production`.
