import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "./auth-user.interface";

/** Inyecta el usuario autenticado (`request.user`) en el handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest().user,
);
