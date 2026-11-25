import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FacturaModule } from "../facturas/factura.module";
import { Factura } from "../facturas/factura.entity";
import { Salida } from "../salidas/salida.entity";
import { Venta } from "../ventas/ventas.entity";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";

@Module({
  imports: [TypeOrmModule.forFeature([Venta, Salida, Factura]), FacturaModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
