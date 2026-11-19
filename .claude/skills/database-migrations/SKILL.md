---
name: database-migrations
description: Modelo de datos PostgreSQL, entidades TypeORM y migraciones de este proyecto. Úsala al crear o cambiar entidades, tablas, índices, constraints, o al migrar un módulo de Mongoose a TypeORM.
---

# Base de datos y migraciones

## Reglas

- **`synchronize: false` siempre** (incluso en local una vez creadas las migraciones). El esquema cambia solo por migraciones versionadas en `src/database/migrations/`.
- Una migración por cambio lógico, con `up` **y** `down`. Nunca editar una migración ya aplicada: crear otra.
- Generar con `typeorm migration:generate`, **revisar el SQL** antes de aceptarlo.
- Cambios destructivos (borrar columna, cambiar tipo) en dos pasos: añadir nuevo → migrar datos → quitar viejo.
- Conexión por `DATABASE_URL` (Neon, SSL requerido). Pool pequeño.

## Modelo objetivo

```
usuarios        id serial PK · nombre · email UNIQUE · telefono · password_hash · es_admin bool
productos       id serial PK · nombre · descripcion · categoria · precio_unidad int · descuento int(%)
                stock int CHECK(stock>=0) · creado_en timestamptz
producto_imagenes  id · producto_id FK→productos ON DELETE CASCADE · public_id · url · orden
salidas         id serial PK · fecha date · total int · factura · tienda
salida_imagenes    id · salida_id FK→salidas ON DELETE CASCADE · public_id · url · orden
ventas          id serial PK · fecha date UNIQUE · total int · total_pinateria int
                total_papeleria int · total_transferencias int
```

- Dinero: `integer` en pesos. Fechas de negocio: `date`. Instantes: `timestamptz`.
- `categoria`: `varchar` con `CHECK` o enum (`Piñateria`, `Papeleria`) — confirmar valores.
- Tablas hijas de imágenes en vez de strings con `|`; `ON DELETE CASCADE` para la fila, y el service limpia Cloudinary.
- `ventas.fecha UNIQUE` permite el upsert atómico: `INSERT … ON CONFLICT (fecha) DO UPDATE`.

## Convenciones de entidades

- Columnas en `snake_case` (`@Column({ name: 'precio_unidad' })`), propiedades en `camelCase`.
- `@PrimaryGeneratedColumn("increment")`; el JSON expone `id` numérico.
- Índices explícitos con `@Index` para filtros reales (`salidas.fecha`, `productos.categoria`).
- Relaciones: `@OneToMany(() => ProductoImagen, i => i.producto, { cascade: true })` y `@ManyToOne(..., { onDelete: 'CASCADE' })`.
- Nunca devolver la entidad cruda al cliente si tiene campos internos: usar DTO de salida.

## Flujo de un módulo nuevo

1. Entidad + migración (`up`/`down`).
2. DTOs con validación.
3. Service sobre `Repository` (transacciones para escrituras multi-tabla).
4. Tests de integración contra Postgres real para consultas y constraints.
5. Actualizar Swagger, CHANGELOG y, si cambia el contrato, el frontend.

## Verificación

Para validar una migración hay que ejecutarla contra una base de prueba (acción que requiere que el usuario lo autorice). Mientras tanto, indicar que quedó sin verificar.
