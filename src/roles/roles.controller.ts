import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { Autorizar } from "../auth/autorizar.decorator";
import { CurrentUser } from "../auth/decorators";
import { Permiso } from "../auth/permisos";
import { GuardarRolDto } from "./dtos/guardar-rol.dto";
import { RolesService } from "./roles.service";

@Controller("api/roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // También lo necesita quien asigna roles, para elegirlos en la lista de usuarios.
  @Get()
  @Autorizar(Permiso.RolesVer, Permiso.UsuariosAsignarRoles)
  listar() {
    return this.rolesService.listar();
  }

  @Get("permisos")
  @Autorizar(Permiso.RolesVer, Permiso.RolesCrear, Permiso.RolesEditar)
  catalogo() {
    return this.rolesService.catalogo();
  }

  @Post()
  @Autorizar(Permiso.RolesCrear)
  crear(@CurrentUser() actor: AuthUser, @Body() dto: GuardarRolDto) {
    return this.rolesService.crear(actor, dto);
  }

  @Put(":id")
  @Autorizar(Permiso.RolesEditar)
  actualizar(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: GuardarRolDto,
  ) {
    return this.rolesService.actualizar(actor, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @Autorizar(Permiso.RolesEliminar)
  eliminar(@Param("id", ParseIntPipe) id: number) {
    return this.rolesService.eliminar(id);
  }
}
