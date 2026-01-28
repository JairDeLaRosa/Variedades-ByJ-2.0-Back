import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { VentasModule } from "./ventas/ventas.module";
import { SalidaModule } from "./salidas/salida.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.modulo";
import { FilesModule } from "./files/files.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.DB_CONECT),
    AuthModule,
    VentasModule,
    CloudinaryModule,
    SalidaModule,
    FilesModule,
  ],
})
export class AppModule {}
