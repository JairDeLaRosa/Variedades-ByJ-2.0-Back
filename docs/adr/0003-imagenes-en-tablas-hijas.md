# 0003. Imágenes en tablas hijas

Estado: aceptado

## Contexto

Productos y salidas guardan varias imágenes de Cloudinary en dos strings separados por
`|` (`publicIds` y `urls`). Es frágil: no hay garantía de que cada `publicId` esté
emparejado con su `url`, no se puede borrar una sola imagen con una consulta, y el
frontend tiene que armar y partir los strings. Además, al borrar una salida, el frontend
borra cada archivo en Cloudinary y después la salida: si falla a mitad, quedan archivos
huérfanos.

## Decisión

- Tablas hijas `producto_imagenes` y `salida_imagenes`, con llave foránea y
  `ON DELETE CASCADE`, y las columnas `public_id`, `url` y `orden`.
- La API expone `imagenes: [{ publicId, url }]` en lugar de strings con `|`.
- El borrado pasa al backend: `DELETE /salidas/:id` borra la fila y limpia Cloudinary de
  forma tolerante a fallos (se registra el error y no se bloquea la respuesta).
- Los `publicId` recibidos se validan contra la carpeta esperada antes de guardarlos o
  borrarlos.

## Consecuencias

- Cambia el contrato de productos y salidas: el frontend se adapta en el mismo trabajo y
  deja de hacer `split("|")` y de borrar archivos uno por uno.
- Las escrituras que tocan fila e imágenes van en una transacción.
