import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "../auth/entities/usuario.entity";
import { Rol } from "../roles/rol.entity";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
