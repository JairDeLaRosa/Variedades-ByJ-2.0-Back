# Salidas

`src/salidas/` · Ruta base `api/salidas` · [← Índice](./README.md)

Dinero que **sale** del negocio, con soportes (imágenes o PDF). Una salida es un **pago o abono**: va asociada a una
[factura](./facturas.md) (pago total o abono) o es un pago **libre** con una nota que dice a qué se refiere. La fecha la
elige quien la registra: puede haber varias en un día o una cada mes.

## Endpoints

| Método | Ruta                    | Permiso             | Descripción                                                    |
| ------ | ----------------------- | ------------------- | -------------------------------------------------------------- |
| POST   | `/api/salidas`          | `salidas.registrar` | `multipart/form-data`: campos + soportes nuevos en `imagenes`. |
| GET    | `/api/salidas`          | `salidas.ver`       | Todas (fecha e id descendente), con su `factura`.              |
| GET    | `/api/salidas/by-month` | `salidas.ver`       | `?date=YYYY-MM`, con su `factura`.                             |
| GET    | `/api/salidas/:id`      | `salidas.ver`       | Una; 404 si no existe.                                         |
| PUT    | `/api/salidas/:id`      | `salidas.editar`    | Reemplaza datos y soportes (`conservar`).                      |
| DELETE | `/api/salidas/:id`      | `salidas.eliminar`  | 204; borra soportes de Cloudinary.                             |

## Reglas

- Campos: `fecha` (`YYYY-MM-DD`), `total` (entero ≥ 1, el valor del pago), `facturaId?`, `nota?` (≤300) y `conservar?`.
  Un campo vacío del formulario multipart cuenta como ausente.
- **Sin `facturaId` la `nota` es obligatoria** (400). Con factura la nota es opcional. La BD lo refuerza con
  `CK_salidas_factura_o_nota`.
- **El pago no puede superar el saldo de la factura**: `total + interesMonto − suma de los demás pagos` (400 con el saldo en
  el mensaje; 400 si la factura no existe). Se valida en una transacción que bloquea la fila de la factura
  (`pessimistic_write`), así dos abonos simultáneos no la sobrepasan. Al editar un pago se excluye a sí mismo del cálculo.
- Sin `facturaId` (pago libre) se guarda sin transacción adicional.
- `create` y `update` terminan releyendo la salida con `findOne` para devolver `factura`; `update` y `remove` cargan la salida
  **sin** la relación `factura` (`cargar`) para que `facturaId` sea lo único que manda al guardar.
- Mismo patrón de soportes que [productos](./productos.md): máx. 5, subir todo o nada, borrar de Cloudinary los que sobran
  tras guardar, `conservar` debe pertenecer a la salida (400), soporte repetido → 409.
- `by-month` usa `rangoDelMes` ([common](./common.md)).

## Respuesta

`{ id, fecha, total, facturaId, nota, factura: { id, numero, proveedor, ... } | null, imagenes: [{ publicId, url }],
createdAt, updatedAt }`. `factura` es eager y trae solo los campos de la tabla (no cuotas ni soportes).

## Modelo de datos

`salidas`: `id`, `fecha` (índice), `total`, `factura_id` (FK a `facturas`, `ON DELETE RESTRICT`, índice), `nota`, `created_at`,
`updated_at`; CHECK `total >= 0`. `salida_imagenes`: `salida_id` (CASCADE), `public_id` único, `url`. Imágenes `eager`.
Ver [base de datos](./base-de-datos.md).

## Relaciones

- [facturas](./facturas.md): `Salida.factura`; los pagos de una factura son sus salidas.
- [files-cloudinary](./files-cloudinary.md): soportes.
- [reportes](./reportes.md): suma `total` por rango y arma el ranking de proveedores con el de la factura.

## Trampas

- **Contrato roto respecto a la versión anterior**: `factura` (texto) y `tienda` ya no existen en la salida; el cliente que
  los envíe recibe 400 (`forbidNonWhitelisted`). La web debe actualizarse a la vez (ver `docs/DEPLOY.md`).
- No se puede borrar una [factura](./facturas.md) que tenga salidas; sí se puede borrar la salida.

## Historial de cambios

- `feat(files)` Soportes subidos en el mismo endpoint de crear/editar.
- `fix(db)` Clave foránea de imágenes con nombre explícito.
- Las salidas pasan a ser pagos/abonos de una factura (`facturaId`) o pagos libres con `nota`; se valida el saldo con bloqueo;
  migración `CreateFacturas` convierte las salidas existentes en facturas libres pagadas (aplicada en `production` el 2026-11-25).
