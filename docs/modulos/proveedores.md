# Proveedores

`src/proveedores/` · Ruta base `api/proveedores` · [← Índice](./README.md)

Catálogo de los proveedores a los que se les compra. Cada [factura](./facturas.md) pertenece a un proveedor de esta lista, y
desde aquí se ve cuánto se les ha facturado, pagado y se les debe.

## Endpoints

| Método | Ruta                   | Permiso                | Descripción                                                                                                                      |
| ------ | ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/proveedores`     | `proveedores.crear`    | JSON. Solo `nombre` es obligatorio. 409 si el nombre ya existe.                                                                  |
| GET    | `/api/proveedores`     | `proveedores.ver`      | Lista por nombre con `totalFacturas` y `saldo` de cada uno. Filtros `?buscar=` (nombre, NIT o contacto) y `?activo=true\|false`. |
| GET    | `/api/proveedores/:id` | `proveedores.ver`      | Detalle: datos, `resumen` (`facturas`, `facturado`, `pagado`, `saldo`) y `facturas` (mismo formato que `GET api/facturas`). 404. |
| PUT    | `/api/proveedores/:id` | `proveedores.editar`   | Reemplaza los datos; `activo` se conserva si no viene (así se desactiva y reactiva). 409 si el nombre choca con otro.            |
| DELETE | `/api/proveedores/:id` | `proveedores.eliminar` | 204; 409 si tiene facturas o pagos (hay que desactivarlo).                                                                       |

## Reglas

- **Solo `nombre` es obligatorio** (≤100). `nit` (≤30), `contacto` (≤100), `telefono` (≤30), `email` (válido, ≤150), `direccion`
  (≤200) y `notas` (≤500) son opcionales; un texto vacío o `null` cuenta como «sin dato». Un PUT reemplaza todo: lo que no
  viene queda en `null`.
- El nombre es único **sin distinguir mayúsculas** (índice `UQ_proveedores_nombre` sobre `lower(nombre)`).
- `saldo` = facturado (total más interés) − pagado, sumando todas las facturas del proveedor; `resumen` se calcula con una sola
  consulta agregada sobre `facturas` y `salidas` (lo pagado son las salidas de cada factura).
- Un proveedor **desactivado** no se puede elegir en facturas nuevas, ni cambiar una factura a él; una factura que ya lo tiene
  se puede seguir editando. Los desactivados siguen apareciendo en la lista y en los reportes.
- No se borra un proveedor con facturas ni con pagos libres: las FK `RESTRICT` responden 409 con «desactívalo en lugar de eliminarlo».

## Modelo de datos

`proveedores`: `id`, `nombre`, `nit`, `contacto`, `telefono`, `email`, `direccion`, `notas`, `activo` (default `true`),
`created_at`, `updated_at`; índice único `UQ_proveedores_nombre`. `facturas.proveedor_id` (NOT NULL, FK `ON DELETE RESTRICT`,
índice) reemplaza al texto `facturas.proveedor`. Migración `CreateProveedores` ([base de datos](./base-de-datos.md)): crea un
proveedor por cada nombre distinto de las facturas existentes (sin distinguir mayúsculas ni espacios de los bordes) y las enlaza.

## Relaciones

- [facturas](./facturas.md): `Factura.proveedorRef` (eager) y `proveedorId`; `ProveedorModule` importa `FacturaModule` y usa
  `FacturaService.findAll({ proveedorId })` para el detalle.
- [reportes](./reportes.md): el ranking de pagos y la deuda por proveedor agrupan por la tabla `proveedores`.
- [salidas](./salidas.md): `factura.proveedor` (nombre) sigue en su respuesta, y los pagos libres se asocian a un proveedor (`salidas.proveedor_id`).
- [auth](./auth.md): permisos `proveedores.*` (el Administrador los recibe solo; a los demás roles hay que dárselos).

## Trampas

- Elegir un proveedor al registrar una factura exige poder listarlos (`proveedores.ver`).
- Cambiar el nombre de un proveedor cambia el que se ve en todas sus facturas, salidas y reportes (ya no es un texto por factura).

## Historial de cambios

- Módulo creado: entidad, CRUD, resumen por proveedor, migración `CreateProveedores`, permisos `proveedores.*` y tests.
  Las facturas dejan el proveedor de texto libre por `proveedorId`.
- Los pagos libres ([salidas](./salidas.md)) se asocian a un proveedor; un proveedor con pagos tampoco se puede eliminar.
