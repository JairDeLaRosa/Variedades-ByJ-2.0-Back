import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CloudinaryModule } from "src/cloudinary/cloudinary.modulo";
import { Producto, ProductoSchema } from "./producto.schema";
import { ProductoController } from "./producto.controller";
import { ProductoService } from "./producto.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Producto.name, schema: ProductoSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ProductoController],
  providers: [ProductoService],
})
export class ProductoModule {}
