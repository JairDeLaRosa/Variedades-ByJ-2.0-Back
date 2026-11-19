# 0002. Fechas como `date` y `timestamptz`

Estado: aceptado

## Contexto

Hoy las fechas se guardan de forma inconsistente: `fecha` es un `string` en salidas y
productos, y un `Date` a medianoche de Colombia en ventas, con un campo extra `fechaDia`
solo para forzar la unicidad por día. Las consultas por mes comparan strings. La
conversión de zona horaria con `Date` puede mostrar un día corrido.

## Decisión

- Los días de negocio (ventas, salidas) son columnas `date` (`YYYY-MM-DD`), sin hora ni
  zona horaria. `ventas.fecha` es `UNIQUE`, lo que reemplaza a `fechaDia`.
- Los instantes reales (por ejemplo, la creación de un producto) son `timestamptz`, en
  UTC. El frontend los muestra en `America/Bogota`.
- Las consultas por mes usan el rango `[inicio, inicio del mes siguiente)` sobre `date`.
- Los DTOs validan el formato con `@IsDateString`.

## Consecuencias

- La API deja de devolver `fechaDia`: ventas expone solo `fecha`. El frontend se adapta
  en el mismo trabajo.
- Se elimina la conversión manual de zonas horarias en `ventas.service`.
- Colombia no tiene horario de verano, pero la regla sirve igual si cambia la zona.
