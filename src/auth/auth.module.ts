import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Rol } from "../roles/rol.entity";
import { AuthService } from "./auth.service";
import { Usuario } from "./entities/usuario.entity";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { AuthController } from "./auth.controller";

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Usuario, Rol]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("SECRET_JWT_SEED"),
        signOptions: { expiresIn: "2h" },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
