import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FacturaModule } from "../facturas/factura.module";
import { ProveedorController } from "./proveedor.controller";
import { Proveedor } from "./proveedor.entity";
import { ProveedorService } from "./proveedor.service";

@Module({
  imports: [TypeOrmModule.forFeature([Proveedor]), FacturaModule],
  controllers: [ProveedorController],
  providers: [ProveedorService],
  exports: [ProveedorService],
})
export class ProveedorModule {}
