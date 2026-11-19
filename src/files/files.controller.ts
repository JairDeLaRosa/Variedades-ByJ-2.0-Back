import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { FilesService } from "./files.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

const MAX_ARCHIVOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

@Controller("api/files")
@UseGuards(JwtAuthGuard, AdminGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /** Sube soportes a Cloudinary. Quedan asociados al guardar la salida. */
  @Post("upload-multiple")
  @UseInterceptors(
    FilesInterceptor("files", MAX_ARCHIVOS, {
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, callback) =>
        TIPOS_PERMITIDOS.test(file.mimetype)
          ? callback(null, true)
          : callback(
              new BadRequestException(
                "Solo imágenes (jpg, png, webp, gif) o PDF",
              ),
              false,
            ),
    }),
  )
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException("Archivos requeridos");
    }

    const subidos = await Promise.all(
      files.map((file) => this.filesService.uploadFile(file)),
    );

    return {
      imagenes: subidos.map((r) => ({
        publicId: r.public_id,
        url: r.secure_url,
      })),
    };
  }
}
