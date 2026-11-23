import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PERMISOS_KEY, PermisosGuard } from "./guards/permisos.guard";
import { Permiso } from "./permisos";

/**
 * Exige sesión iniciada y que el rol del usuario tenga **alguno** de los
 * permisos indicados (sin permisos, basta con haber iniciado sesión). Va en un
 * controlador entero o en un método. Los permisos se leen de la base de datos
 * en cada petición, así un cambio de rol vale al instante.
 */
export const Autorizar = (...permisos: Permiso[]) =>
  applyDecorators(
    SetMetadata(PERMISOS_KEY, permisos),
    UseGuards(JwtAuthGuard, PermisosGuard),
  );
