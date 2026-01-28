import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SalidaService } from "./salida.service";
import { SalidaController } from "./salida.controller";
import { Salida, SalidaSchema } from "./salida.schema";
import { CloudinaryModule } from "src/cloudinary/cloudinary.modulo";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Salida.name, schema: SalidaSchema }]),
    CloudinaryModule,
  ],
  controllers: [SalidaController],
  providers: [SalidaService],
})
export class SalidaModule {}
