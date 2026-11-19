import { Inject, Injectable, Logger } from "@nestjs/common";
import { v2 as Cloudinary, UploadApiResponse } from "cloudinary";

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
