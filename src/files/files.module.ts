import { Module } from "@nestjs/common";
import { FilesService } from "./files.service";
import { FilesController } from "./files.controller";
import { CloudinaryModule } from "src/cloudinary/cloudinary.modulo";

@Module({
  imports: [CloudinaryModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
