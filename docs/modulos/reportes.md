# Reportes

`src/reportes/` · Ruta base `api/reportes` · [← Índice](./README.md)

Resumen financiero de un rango de fechas: ventas (del **cierre diario**) contra salidas.

## Endpoint

| Método | Ruta                    | Permiso        | Descripción                                             |
| ------ | ----------------------- | -------------- | ------------------------------------------------------- |
| GET    | `/api/reportes/resumen` | `reportes.ver` | `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` (ambos incluidos). |

## Respuesta (`ReporteResumen`)

`{ desde, hasta, granularidad: "dia"|"mes", ventas:{ total, papeleria, pinateria, transferencias, dias },
salidas:{ total, cantidad }, balance, serie:[{ periodo, ventas, salidas }], tiendas:[{ tienda, total, cantidad }],
mejoresDias:[{ fecha, total }] }`.

## Reglas

- `diasDelRango` valida fechas reales (rechaza `2026-02-31`), `desde <= hasta` y rango **≤ 1100 días** (400).
- **Granularidad**: serie diaria si el rango ≤ 62 días; si no, mensual (`to_char` con `YYYY-MM-DD` o `YYYY-MM`; el formato es
  una de dos constantes, nunca texto del cliente).
- `balance = ventas.total − salidas.total`. `unirSeries` combina ventas y salidas por periodo, ordenado ascendente.
- Rankings: top **5** tiendas (por total de salidas; el nombre es el **proveedor de la factura** y los pagos sin factura se
  agrupan como «Sin factura») y top 5 días con más ventas.
- Las 6 consultas corren en paralelo (`Promise.all`).

## Relaciones

- [ventas](./ventas.md) (`Venta`): fuente de ventas. **No** incluye las [ventas del sistema](./pedidos.md) (pedidos entregados).
- [salidas](./salidas.md) (`Salida`): fuente de salidas; su `factura` ([facturas](./facturas.md)) da el proveedor del ranking.
- [auth](./auth.md): permiso `reportes.ver`.

## Trampas

- El ranking depende del `LEFT JOIN` de `salidas` con `facturas`; el campo de la respuesta se sigue llamando `tienda`
  por compatibilidad con la web.
- Las salidas son pagos y solo se cuentan por `fecha`: una factura a cuotas aparece repartida en las fechas de sus abonos,
  no en la de la factura.

## Historial de cambios

- Módulo creado con resumen por rango, serie diaria/mensual y rankings.
- El ranking de tiendas toma el proveedor de la factura (`LEFT JOIN`) y agrupa los pagos libres como «Sin factura».
