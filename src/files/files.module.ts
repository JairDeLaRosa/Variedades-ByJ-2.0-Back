import { Module } from "@nestjs/common";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";
import { CloudinaryModule } from "../cloudinary/cloudinary.modulo";

@Module({
  imports: [CloudinaryModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
