import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { Autorizar } from "../auth/autorizar.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/decorators";
import { Permiso } from "../auth/permisos";
import { CambiarRolDto } from "./dtos/cambiar-rol.dto";
import { ListarUsuariosQueryDto } from "./dtos/listar-usuarios-query.dto";
import { UsuariosService } from "./usuarios.service";

@Controller("api/usuarios")
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Autorizar(Permiso.UsuariosVer)
  listar(@Query() consulta: ListarUsuariosQueryDto) {
    return this.usuariosService.listar(consulta);
  }

  @Patch(":id/rol")
  @Autorizar(Permiso.UsuariosAsignarRoles)
  cambiarRol(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() { rolId }: CambiarRolDto,
  ) {
    return this.usuariosService.cambiarRol(actor, id, rolId);
  }
}
