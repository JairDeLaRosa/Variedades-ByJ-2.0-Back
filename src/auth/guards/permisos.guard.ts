import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthUser } from "../auth-user.interface";
import { Permiso } from "../permisos";

export const PERMISOS_KEY = "permisos";

/**
 * Úsalo después de JwtAuthGuard: deja pasar a quien tenga alguno de los
 * permisos indicados con `@Autorizar(...)`. El Administrador pasa siempre.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Permiso[] | undefined>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requeridos?.length) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    const permitido =
      user &&
      (user.esAdmin || requeridos.some((p) => user.permisos.includes(p)));
    if (!permitido) {
      throw new ForbiddenException("No tienes permiso para esta acción.");
    }
    return true;
  }
}
