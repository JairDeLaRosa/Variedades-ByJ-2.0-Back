# Files y Cloudinary

`src/files/` y `src/cloudinary/` · Sin rutas propias · [← Índice](./README.md)

Capa interna para subir y borrar imágenes/PDF. **Solo la API habla con Cloudinary**; el navegador únicamente muestra las URL públicas.

## Piezas

| Pieza                                   | Función                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `CloudinaryModule`/`CloudinaryProvider` | Provider `"CLOUDINARY"`: configura el SDK con `CLOUDINARY_NAME/API_KEY/API_SECRET`.                 |
| `FilesModule` / `FilesService`          | Exporta `FilesService` (`uploadFile`, `uploadAll`, `deleteFiles`, `validarLote`).                   |
| `archivos.ts`                           | Constantes e interceptores de multer: `interceptorArchivos(campo="imagenes")`, `interceptorLogo()`. |

## Reglas y límites

- **Tipos permitidos**: jpeg, png, webp, gif y PDF (`interceptorArchivos`); el logo, solo imágenes.
- **Máx. 5 archivos** por registro (`MAX_ARCHIVOS`, cuenta los conservados + nuevos) y **3 MB en total** por petición (`MAX_BYTES_TOTAL`).
  Multer limita cada archivo; la suma la valida `validarLote` (400).
- **Carpeta** Cloudinary `docs`; `resource_type: "auto"`. Los `publicId` válidos son `docs/[A-Za-z0-9_-]+` (`ImagenDto` en [common](./common.md)).
- `uploadAll`: sube todo o nada; si uno falla borra los ya subidos y responde 502.
- `deleteFiles`: **nunca lanza**; registra el error con `Logger`. La BD es la fuente de verdad y un huérfano no debe tumbar la operación.
  Usa `resource_type: "image"`.

## Patrón de uso (todos los módulos)

1. `validarLote(archivos, conservados)` → 2. `uploadAll` → 3. guardar en BD (transacción) → si falla, `deleteFiles(subidos)` →
2. tras guardar, `deleteFiles` de lo que ya no se usa.

## Quién lo usa

[productos](./productos.md) (fotos), [salidas](./salidas.md) y [facturas](./facturas.md) (soportes), [pedidos](./pedidos.md) (comprobante de pago),
[configuracion](./configuracion.md) (logo) y, en desarrollo, [facturas](./facturas.md).

## Trampas

- `deleteFiles` usa `resource_type: "image"`: un PDF subido con `auto` puede quedar como `raw` y no borrarse (se registra error). Revisar si se corrige.
- El provider lee `process.env` directamente (la validación de variables ocurre antes, ver [arranque](./arranque.md)).

## Historial de cambios

- `feat(files)` Subida de imágenes en el mismo endpoint de productos y salidas.
