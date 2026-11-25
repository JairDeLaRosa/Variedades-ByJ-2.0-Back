# Facturas

`src/facturas/` · Ruta base `api/facturas` · [← Índice](./README.md)

Factura de compra a un proveedor y cuánto se ha pagado de ella. Lo **pagado** no se guarda: se calcula sumando las
[salidas](./salidas.md) (pagos y abonos) que apuntan a la factura (`salidas.factura_id`).

## Endpoints

| Método | Ruta                           | Permiso              | Descripción                                                                                             |
| ------ | ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------- |
| POST   | `/api/facturas`                | `facturas.registrar` | `multipart/form-data`: campos + soportes nuevos en `imagenes`. 409 si el número ya existe.              |
| GET    | `/api/facturas`                | `facturas.ver`       | Lista con `totalAPagar`, `pagado`, `saldo` y `estado`. Filtros `?estado=&proveedor=&mes=YYYY-MM`.       |
| GET    | `/api/facturas/resumen`        | `facturas.ver`       | `facturado`, `pagado`, `porPagar`, `vencido`, `porVencer7Dias`, `facturasConSaldo`, `masDeuda` (top 5). |
| GET    | `/api/facturas/simular-cuotas` | `facturas.registrar` | `?total&numeroCuotas&periodicidad&primeraCuota&interesPorcentaje?`: calcula el calendario sin guardar.  |
| GET    | `/api/facturas/:id`            | `facturas.ver`       | Detalle: cuotas con su estado, soportes y `abonos` (las salidas de la factura). 404 si no existe.       |
| PUT    | `/api/facturas/:id`            | `facturas.editar`    | Reemplaza datos y soportes (`conservar`). Ver reglas con pagos.                                         |
| DELETE | `/api/facturas/:id`            | `facturas.eliminar`  | 204; 409 si tiene pagos. Borra los soportes de Cloudinary.                                              |

`resumen` y `simular-cuotas` están declaradas antes de `:id` en el controller: el orden importa.

## Modalidades de pago

| Modalidad | Significado                                             | Campos requeridos (`CreateFacturaDto`)                                           |
| --------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `libre`   | Sin fecha límite.                                       | —                                                                                |
| `plazo`   | Una sola fecha límite.                                  | `vence`                                                                          |
| `cuotas`  | Calendario de cuotas iguales (2–60) con interés simple. | `numeroCuotas`, `periodicidad` (`semanal`/`quincenal`/`mensual`), `primeraCuota` |

Comunes: `numero` (≤50, único sin distinguir mayúsculas), `proveedor` (≤100, texto libre), `fecha`, `total` (1–2.000.000.000),
`interesPorcentaje?` (0–100, 2 decimales), `notas?` (≤500), `conservar?` (soportes). Los campos de otra modalidad se
ignoran. Con `forbidNonWhitelisted`, cualquier campo no declarado en el DTO da 400.

## Cálculos (`calculos.ts`, funciones puras)

- `calcularCuotas`: `interesMonto = round(total*interes/100)`; cuotas iguales con `floor`; **la última absorbe el redondeo**
  para que la suma cuadre. `semanal` = 7 días, `quincenal` = 15, `mensual` = `sumarMeses` (el 31 ene + 1 mes = 28/29 feb).
- `repartirPagos`: aplica lo pagado a las cuotas **en orden**; los abonos pertenecen a la factura, no a una cuota (se puede
  adelantar o pagar de más una cuota).
- `obligacionesDe`: ninguna (libre), una con el plazo completo (plazo) o una por cuota (cuotas).
- `estadoDeFactura`: `pagada` si saldo ≤ 0; `vencida` si alguna obligación con saldo venció; si no `parcial` o `pendiente`.
- `hoyNegocio()`: fecha de hoy en `America/Bogota`. Úsala para comparar vencimientos (no `new Date()` UTC).

`saldo = total + interesMonto − pagado`. `vencido` (resumen) suma lo pendiente de las obligaciones ya vencidas; `porVencer7Dias`,
lo que vence entre hoy y 7 días.

## Reglas al editar y borrar

- Con **pagos registrados** no se puede cambiar la modalidad, ni el total o el calendario de una factura a cuotas (400).
  En libre y plazo el total no puede quedar por debajo de lo ya pagado (400). Sin pagos, las cuotas se borran y se regeneran.
- La edición bloquea la fila de la factura (`pessimistic_write`) mientras valida, para que un abono simultáneo no cambie lo
  comprobado.
- No se puede borrar una factura con pagos (409); si un pago entra entre la comprobación y el borrado, la FK `RESTRICT`
  responde 409 también.

## Modelo de datos

`facturas` (`numero`, `proveedor`, `fecha`, `total`, `modalidad`, `vence`, `periodicidad`, `interes_porcentaje` numeric(5,2)
con transformer a número, `interes_monto`, `notas`), `factura_cuotas` (`numero`, `vence`, `monto`; CASCADE; único por
`(factura_id, numero)`) y `factura_imagenes` (`public_id` único, `url`; CASCADE). Índice único `UQ_facturas_numero` sobre
`lower(numero)`. Las relaciones **no** son `eager` para que [salidas](./salidas.md), que cargan su factura, no arrastren
cuotas ni soportes. Migración `CreateFacturas` ([base de datos](./base-de-datos.md)).

## Trampas

- El filtro `?estado=` se aplica **en memoria** (la «vencida» depende de las cuotas): bien para una tienda pequeña; si la
  lista crece mucho, moverlo a SQL.
- El `resumen` carga todas las facturas con sus cuotas; ídem.
- Un error de unicidad se distingue por el nombre de la constraint (`UQ_facturas_numero` = número repetido; otra = soporte).

## Relaciones

- [salidas](./salidas.md): `Salida.factura` (eager, `RESTRICT`); valida que un pago no supere `total + interesMonto − otros pagos`.
- [files-cloudinary](./files-cloudinary.md): soportes de la factura (`conservar`, `MAX_ARCHIVOS`).
- [common](./common.md): rangos mensuales (`rangoDelMes`).
- [auth](./auth.md): permisos `facturas.*`.

## Historial de cambios

- Módulo creado: entidades, `calculos.ts`, service, controller, migración `CreateFacturas`, permisos `facturas.*`, tests
  (`calculos.spec.ts`, `factura.service.spec.ts`) y simulador de cuotas. Los tests y la migración no se han ejecutado.
