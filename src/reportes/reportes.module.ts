import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Salida } from "../salidas/salida.entity";
import { Venta } from "../ventas/ventas.entity";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";

@Module({
  imports: [TypeOrmModule.forFeature([Venta, Salida])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
