import { ForbiddenException } from "@nestjs/common";
import { Rol } from "../roles/rol.entity";
import { AuthUser } from "./auth-user.interface";
import { Usuario } from "./entities/usuario.entity";
import { Permiso, TODOS_LOS_PERMISOS } from "./permisos";

const CONOCIDOS = new Set<string>(TODOS_LOS_PERMISOS);

/** Permisos efectivos de un rol: el Administrador tiene todos. */
export function permisosDeRol(rol: Pick<Rol, "clave" | "permisos">): Permiso[] {
  if (rol.clave === "admin") return [...TODOS_LOS_PERMISOS];
  // Un permiso que ya no existe en el catálogo se ignora en vez de fallar.
  return (rol.permisos ?? [])
    .map((p) => p.permiso)
    .filter((p) => CONOCIDOS.has(p));
}

/** Arma el usuario de la petición a partir de uno cargado con su rol y permisos. */
export function construirAuthUser(
  usuario: Pick<Usuario, "id" | "name" | "rol">,
): AuthUser {
  return {
    uid: usuario.id,
    name: usuario.name,
    rolId: usuario.rol.id,
    rolNombre: usuario.rol.nombre,
    esAdmin: usuario.rol.clave === "admin",
    permisos: permisosDeRol(usuario.rol),
  };
}

/**
 * Nadie puede dar ni tocar permisos que no tiene: así un usuario con permiso
 * para asignar roles no se escala a Administrador.
 */
export function exigirPermisosPropios(
  actor: AuthUser,
  permisos: Permiso[],
  mensaje = "No puedes dar permisos que tú no tienes",
): void {
  if (actor.esAdmin) return;
  const sobran = permisos.filter((p) => !actor.permisos.includes(p));
  if (sobran.length > 0) {
    const vistos = sobran.slice(0, 3).join(", ");
    const resto = sobran.length > 3 ? ` y ${sobran.length - 3} más` : "";
    throw new ForbiddenException(`${mensaje}: ${vistos}${resto}.`);
  }
}
