# Configuración

`src/configuracion/` · Ruta base `api/configuracion` · [← Índice](./README.md)

Datos del negocio en **una sola fila** (`id = 1`): nombre, eslogan, descripción, NIT, dirección, teléfono, correo, horario,
Facebook, Instagram, WhatsApp, datos de transferencia y logo. Los muestran la tienda (barra, pie), el comprobante de venta y
la pantalla de pago por transferencia.

## Endpoints

| Método | Ruta                 | Acceso                 | Descripción                                                   |
| ------ | -------------------- | ---------------------- | ------------------------------------------------------------- |
| GET    | `/api/configuracion` | **público**            | Datos del negocio. Sin nada interno (ni `publicId` del logo). |
| PUT    | `/api/configuracion` | `configuracion.editar` | `multipart/form-data`: datos + logo nuevo en `logo`.          |

Respuesta: `{ nombre, eslogan, descripcion, nit, direccion, telefono, correo, horario, facebook, instagram, whatsapp,
cuentaTransferencia, logo: { url } | null, updatedAt }`.

## Reglas

- Solo `nombre` es obligatorio (≤80). Los demás son opcionales; **texto vacío = borrar el dato** (se guarda `null`,
  normalizando `\r\n` y recortando espacios).
- `facebook`/`instagram` deben ser enlaces `http(s)://`; `whatsapp` un teléfono (`+ dígitos espacios ( ) -`, 7–30);
  `cuentaTransferencia` ≤500, una línea por dato.
- **Logo**: máx. 1 archivo, solo imagen (`interceptorLogo`). Si llega uno nuevo reemplaza al actual; `quitarLogo=true` lo
  elimina. El logo anterior se borra de Cloudinary **después** de guardar; si la BD falla se borra el recién subido.
- Si falta la fila (migración sin correr) → 404 «Falta la configuración del negocio.».

## Modelo de datos

`configuracion` con `CHK_configuracion_unica CHECK (id = 1)`; la migración `CreateConfiguracion` siembra la fila.
Ver [base de datos](./base-de-datos.md).

## Relaciones

- [files-cloudinary](./files-cloudinary.md): subida/borrado del logo.
- [pedidos](./pedidos.md): el cliente ve `cuentaTransferencia` para pagar por transferencia.
- [auth](./auth.md): permiso `configuracion.editar`.

## Historial de cambios

- `feat` Configuración de la empresa (PR #21): datos del negocio y logo editables.
