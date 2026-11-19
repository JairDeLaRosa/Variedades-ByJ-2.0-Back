import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthUser } from "../auth-user.interface";

/** Úsalo después de JwtAuthGuard: solo deja pasar a administradores. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user?.admin) {
      throw new ForbiddenException("Requiere permisos de administrador.");
    }
    return true;
  }
}
