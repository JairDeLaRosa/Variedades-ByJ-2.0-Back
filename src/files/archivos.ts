import { BadRequestException } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";

/** Máximo de fotos (o soportes) que puede tener un producto o una salida. */
export const MAX_ARCHIVOS = 5;
/** Tope entre todos los archivos nuevos de una misma petición. */
export const MAX_BYTES_TOTAL = 3 * 1024 * 1024;

const TIPOS_PERMITIDOS = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

/**
 * Recibe los archivos nuevos del formulario junto con sus campos de texto.
 * Multer solo limita cada archivo; la suma se valida en `FilesService`.
 */
export const interceptorArchivos = (campo = "imagenes") =>
  FilesInterceptor(campo, MAX_ARCHIVOS, {
    limits: { fileSize: MAX_BYTES_TOTAL },
    fileFilter: (_req, file, callback) =>
      TIPOS_PERMITIDOS.test(file.mimetype)
        ? callback(null, true)
        : callback(
            new BadRequestException(
              "Solo imágenes (jpg, png, webp, gif) o PDF",
            ),
            false,
          ),
  });
