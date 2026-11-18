# 0001. Migrar de MongoDB a PostgreSQL

Estado: aceptado

## Contexto

El backend usa MongoDB con Mongoose. Los datos son tabulares y sin relaciones complejas
(productos, ventas diarias, salidas y usuarios), pero necesitan integridad: una venta
única por día, stock no negativo, imágenes ligadas a su registro. Las imágenes se guardan
hoy como strings separados por `|`, y las fechas como strings y `Date` mezclados.
SQL es además la habilidad más demandada laboralmente, y hay opciones gratuitas
de PostgreSQL (Neon).

## Decisión

Migrar a PostgreSQL con TypeORM, desplegado en Neon. Se empieza con la base vacía, sin
migrar datos de Mongo. El esquema cambia solo mediante migraciones versionadas.
La migración se hace módulo por módulo (`auth`, `ventas`, `salidas`, `productos`),
cada uno en su propia rama y PR.

## Consecuencias

- Constraints reales (`UNIQUE`, `CHECK`, llaves foráneas) y transacciones.
- Hay que reescribir entidades, services y tests de cada módulo.
- El contrato de la API cambia de forma deliberada y documentada (fechas como `date`,
  `imagenes` como arreglo). El frontend se actualiza en el mismo trabajo.
- Neon suspende la base tras inactividad: la primera petición puede tardar.
