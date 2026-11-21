import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { v2 as Cloudinary, UploadApiResponse } from "cloudinary";
import { ImagenDto } from "../common/dtos/imagen.dto";
import { MAX_ARCHIVOS, MAX_BYTES_TOTAL } from "./archivos";

export const CARPETA_SOPORTES = "docs";

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(@Inject("CLOUDINARY") private cloudinary: typeof Cloudinary) {}

  uploadFile(
    file: Express.Multer.File,
    folder = CARPETA_SOPORTES,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "auto", // imágenes y PDFs
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  /** Rechaza el lote si no cabe en el límite de archivos o de tamaño. */
  validarLote(archivos: Express.Multer.File[], conservados: number): void {
    if (conservados + archivos.length > MAX_ARCHIVOS) {
      throw new BadRequestException(
        `Máximo ${MAX_ARCHIVOS} archivos por registro.`,
      );
    }
    const bytes = archivos.reduce((suma, a) => suma + a.size, 0);
    if (bytes > MAX_BYTES_TOTAL) {
      throw new BadRequestException(
        `Los archivos nuevos no pueden pesar más de ${MAX_BYTES_TOTAL / 1024 / 1024} MB en total.`,
      );
    }
  }

  /** Sube todos los archivos o ninguno: si uno falla, borra los ya subidos. */
  async uploadAll(archivos: Express.Multer.File[]): Promise<ImagenDto[]> {
    const resultados = await Promise.allSettled(
      archivos.map((archivo) => this.uploadFile(archivo)),
    );
    const subidos = resultados.flatMap((r) =>
      r.status === "fulfilled"
        ? [{ publicId: r.value.public_id, url: r.value.secure_url }]
        : [],
    );

    if (subidos.length !== archivos.length) {
      await this.deleteFiles(subidos.map((s) => s.publicId));
      throw new BadGatewayException(
        "No se pudieron subir los archivos. Intenta de nuevo.",
      );
    }
    return subidos;
  }

  /**
   * Borra archivos de Cloudinary sin lanzar errores: la base de datos es la
   * fuente de verdad y un archivo huérfano no debe tumbar la operación.
   */
  async deleteFiles(publicIds: string[]): Promise<void> {
    const resultados = await Promise.allSettled(
      publicIds.map((publicId) =>
        this.cloudinary.uploader.destroy(publicId, { resource_type: "image" }),
      ),
    );

    resultados.forEach((resultado, i) => {
      if (resultado.status === "rejected") {
        this.logger.error(
          `No se pudo borrar ${publicIds[i]} de Cloudinary: ${resultado.reason?.message ?? resultado.reason}`,
        );
      }
    });
  }
}
