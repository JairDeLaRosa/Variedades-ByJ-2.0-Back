import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Body,
  Get,
  Delete,
  Param,
  BadRequestException,
  Query,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { FilesService } from "./files.service";
import { CreateFileDto } from "./dto";

@Controller("api/files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // ✅ SUBIR ARCHIVO ÚNICO
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFileDto,
  ) {
    if (!file) throw new BadRequestException("Archivo requerido");

    const result: any = await this.filesService.uploadFile(file, "docs");

    // 👉 aquí normalmente guardas en BD
    return {
      name: dto.name,
      description: dto.description,
      url: result.secure_url,
      publicId: result.public_id,
      type: result.resource_type,
    };
  }

  // ✅ SUBIR MÚLTIPLES ARCHIVOS
  @Post("upload-multiple")
  @UseInterceptors(FilesInterceptor("files", 10)) // máximo 10 archivos
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateFileDto,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException("Archivos requeridos");

    const uploadedFiles = await Promise.all(
      files.map((file) => this.filesService.uploadFile(file, "docs")),
    );

    return {
      name: dto.name,
      description: dto.description,
      totalFiles: uploadedFiles.length,
      files: uploadedFiles.map((result: any) => ({
        url: result.secure_url,
        publicId: result.public_id,
        type: result.resource_type,
        size: result.bytes,
      })),
    };
  }

  // ✅ LISTAR ARCHIVOS POR CARPETA
  @Get("list/:folder")
  async listFiles(
    @Param("folder") folder: string,
    @Query("limit") limit: string = "50",
  ) {
    const maxResults = Math.min(parseInt(limit), 100);
    return this.filesService.listFiles(folder, maxResults);
  }

  // ✅ BUSCAR ARCHIVOS
  @Get("search/:folder")
  async searchFiles(
    @Param("folder") folder: string,
    @Query("q") query: string,
  ) {
    if (!query)
      throw new BadRequestException("Parámetro de búsqueda requerido");
    return this.filesService.searchFiles(folder, query);
  }

  // ✅ OBTENER ARCHIVOS POR TIPO
  @Get("type/:folder")
  async getFilesByType(
    @Param("folder") folder: string,
    @Query("resourceType") resourceType: string = "image",
  ) {
    return this.filesService.getFilesByType(folder, resourceType);
  }

  // ✅ OBTENER INFORMACIÓN DE UN ARCHIVO
  @Get("info/:publicId")
  async getFileInfo(@Param("publicId") publicId: string) {
    return this.filesService.getFileInfo(publicId);
  }

  // ✅ LISTAR TODAS LAS CARPETAS
  @Get("folders/list/all")
  async listFolders() {
    return this.filesService.listFolders();
  }

  // ✅ ELIMINAR ARCHIVO
  @Delete(":publicId")
  async remove(@Param("publicId") publicId: string) {
    return this.filesService.deleteFile(publicId);
  }
}
