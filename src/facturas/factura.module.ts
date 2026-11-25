import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesModule } from "../files/files.module";
import { Salida } from "../salidas/salida.entity";
import { FacturaController } from "./factura.controller";
import { FacturaCuota } from "./factura-cuota.entity";
import { FacturaImagen } from "./factura-imagen.entity";
import { Factura } from "./factura.entity";
import { FacturaService } from "./factura.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, FacturaCuota, FacturaImagen, Salida]),
    FilesModule,
  ],
  controllers: [FacturaController],
  providers: [FacturaService],
})
export class FacturaModule {}
