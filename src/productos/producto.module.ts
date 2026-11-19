import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesModule } from "../files/files.module";
import { Producto } from "./producto.entity";
import { ProductoImagen } from "./producto-imagen.entity";
import { ProductoController } from "./producto.controller";
import { ProductoService } from "./producto.service";

@Module({
  imports: [TypeOrmModule.forFeature([Producto, ProductoImagen]), FilesModule],
  controllers: [ProductoController],
  providers: [ProductoService],
})
export class ProductoModule {}
