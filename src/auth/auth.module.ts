import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthService } from "./auth.service";
import { Usuario, UsuarioSchema } from "./entities/usuario.entity";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { AuthController } from "./auth.controller";

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("SECRET_JWT_SEED"),
        signOptions: { expiresIn: "2h" },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
