import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { typeOrmConfig } from "./database/typeorm.config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { VentasModule } from "./ventas/ventas.module";
import { SalidaModule } from "./salidas/salida.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.modulo";
import { FilesModule } from "./files/files.module";
import { ProductoModule } from "./productos/producto.module";
import { ReportesModule } from "./reportes/reportes.module";
import { HealthController } from "./health/health.controller";
import { envValidationSchema } from "./config/env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    AuthModule,
    VentasModule,
    CloudinaryModule,
    SalidaModule,
    FilesModule,
    ProductoModule,
    ReportesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
