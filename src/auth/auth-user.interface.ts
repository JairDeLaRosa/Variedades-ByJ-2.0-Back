/** Usuario autenticado que Passport deja en `request.user`. */
export interface AuthUser {
  uid: number;
  name: string;
  admin: boolean;
}
