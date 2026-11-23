import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesModule } from "../files/files.module";
import { Configuracion } from "./configuracion.entity";
import { ConfiguracionController } from "./configuracion.controller";
import { ConfiguracionService } from "./configuracion.service";

@Module({
  imports: [TypeOrmModule.forFeature([Configuracion]), FilesModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
})
export class ConfiguracionModule {}
