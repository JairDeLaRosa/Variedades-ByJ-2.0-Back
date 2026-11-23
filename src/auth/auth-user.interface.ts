import { Permiso } from "./permisos";

/** Usuario autenticado que Passport deja en `request.user`. */
export interface AuthUser {
  uid: number;
  name: string;
  rolId: number;
  rolNombre: string;
  /** El rol Administrador: tiene todos los permisos, incluso los futuros. */
  esAdmin: boolean;
  permisos: Permiso[];
}
