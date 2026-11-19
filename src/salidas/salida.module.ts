import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SalidaService } from "./salida.service";
import { SalidaController } from "./salida.controller";
import { Salida } from "./salida.entity";
import { SalidaImagen } from "./salida-imagen.entity";
import { FilesModule } from "../files/files.module";

@Module({
  imports: [TypeOrmModule.forFeature([Salida, SalidaImagen]), FilesModule],
  controllers: [SalidaController],
  providers: [SalidaService],
})
export class SalidaModule {}
