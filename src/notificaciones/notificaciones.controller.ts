import { Controller, Get } from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { Autorizar } from "../auth/autorizar.decorator";
import { CurrentUser } from "../auth/decorators";
import { NotificacionesService } from "./notificaciones.service";

@Controller("api/notificaciones")
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  // Cualquier persona con sesión: el servicio filtra por sus permisos.
  @Get()
  @Autorizar()
  listar(@CurrentUser() actor: AuthUser) {
    return this.notificaciones.listar(actor);
  }
}
