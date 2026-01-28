import { Inject, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { v2 as Cloudinary } from "cloudinary";

@Injectable()
export class FilesService {
  constructor(@Inject("CLOUDINARY") private cloudinary: typeof Cloudinary) {}

  async uploadFile(file: Express.Multer.File, folder = "uploads") {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "auto", // 👈 imágenes y PDFs
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  async deleteFile(publicId: string) {
    return this.cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });
  }

  // Listar todos los archivos de una carpeta
  async listFiles(folder: string = "uploads", maxResults: number = 50) {
    try {
      const result = await this.cloudinary.search
        .expression(`folder:"${folder}"`)
        .max_results(maxResults)
        .execute();
      return result.resources || [];
    } catch (error) {
      throw new HttpException(
        `Error al listar archivos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Buscar archivos por nombre
  async searchFiles(folder: string, query: string) {
    try {
      const result = await this.cloudinary.search
        .expression(`folder:"${folder}" AND public_id~"${query}"`)
        .max_results(50)
        .execute();
      return result.resources || [];
    } catch (error) {
      throw new HttpException(
        `Error al buscar archivos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Obtener archivos por tipo (image o document)
  async getFilesByType(folder: string, resourceType: string) {
    try {
      const result = await this.cloudinary.search
        .expression(`folder:"${folder}" AND resource_type:"${resourceType}"`)
        .max_results(100)
        .execute();
      return result.resources || [];
    } catch (error) {
      throw new HttpException(
        `Error al obtener archivos por tipo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Obtener información de un archivo específico
  async getFileInfo(publicId: string) {
    try {
      const result = await this.cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      throw new HttpException(
        `Archivo no encontrado: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  // Listar todas las carpetas
  async listFolders() {
    try {
      const result = await this.cloudinary.api.root_folders();
      return result.folders || [];
    } catch (error) {
      throw new HttpException(
        `Error al listar carpetas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
