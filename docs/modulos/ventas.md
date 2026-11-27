# Ventas (cierre diario)

`src/ventas/` · Ruta base `api/ventas` · [← Índice](./README.md)

Cierre de caja de **un día**: totales de piñatería y papelería. Una fila por fecha.
**No son las ventas del sistema** (pedidos entregados y de mostrador): esas están en [pedidos](./pedidos.md) bajo `api/ventas-sistema`.

## Endpoints

| Método | Ruta                   | Permiso             | Descripción                                          |
| ------ | ---------------------- | ------------------- | ---------------------------------------------------- |
| POST   | `/api/ventas`          | `cierres.registrar` | Crea el cierre del día o **actualiza** el existente. |
| GET    | `/api/ventas`          | `cierres.ver`       | Todos, fecha descendente.                            |
| GET    | `/api/ventas/by-month` | `cierres.ver`       | `?date=YYYY-MM`, fecha descendente.                  |
| GET    | `/api/ventas/:id`      | `cierres.ver`       | Uno; 404 si no existe.                               |
| DELETE | `/api/ventas/:id`      | `cierres.eliminar`  | 204.                                                 |

`by-month` se declara antes de `:id` en el controlador; mantener ese orden.

## Reglas

- Cuerpo `CreateVentaDto`: `fecha` (`YYYY-MM-DD` válida), `totalPinateria`, `totalPapeleria` (enteros 0–2.000.000.000).
- **`total` se calcula en el servidor** = pinatería + papelería; nunca se confía en el cliente.
- Upsert por fecha: respuesta `{ ok, msg: "Registro creado." | "Registro actualizado.", data }`. Carrera de dos cierres del
  mismo día → 409 por el índice único.
- Rango de mes con `rangoDelMes` ([common](./common.md)): `fecha >= primer día` y `< primer día del mes siguiente`.

## Modelo de datos

`ventas`: `id`, `fecha` (`date`, único), `total`, `total_pinateria`, `total_papeleria`,
`created_at`, `updated_at`; CHECK `CK_ventas_montos`. Ver [base de datos](./base-de-datos.md).

## Relaciones

- [reportes](./reportes.md) suma estas filas para «ventas» y para los mejores días.
- Comparte `MonthQueryDto` y `rangoDelMes` con [salidas](./salidas.md) ([common](./common.md)).
- Permisos `cierres.*` en [auth](./auth.md). El «dashboard» del front usa estos datos y las salidas.

## Historial de cambios

- `total_transferencias` incorporado como columna del cierre (default 0).
- Se quita `totalTransferencias` del cierre diario: columna eliminada (migración `DropTotalTransferenciasVentas`, que se niega a correr si hay montos), `total` = piñatería + papelería y el DTO ya no lo acepta. Las transferencias de los pedidos ([pedidos](./pedidos.md)) no cambian.
