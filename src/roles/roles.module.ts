import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "../auth/entities/usuario.entity";
import { RolPermiso } from "./rol-permiso.entity";
import { Rol } from "./rol.entity";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  imports: [TypeOrmModule.forFeature([Rol, RolPermiso, Usuario])],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
