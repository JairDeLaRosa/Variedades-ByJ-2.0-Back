import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthUser } from "../auth-user.interface";
import { Permiso } from "../permisos";
import { PermisosGuard } from "./permisos.guard";

const usuario = (permisos: Permiso[], esAdmin = false): AuthUser => ({
  uid: 1,
  name: "Ana",
  rolId: 2,
  rolNombre: "Rol",
  esAdmin,
  permisos,
});

const contexto = (user?: AuthUser) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as never;

describe("PermisosGuard", () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new PermisosGuard(reflector as unknown as Reflector);

  it("deja pasar a quien tiene el permiso", () => {
    reflector.getAllAndOverride.mockReturnValue([Permiso.ProductosCrear]);

    expect(guard.canActivate(contexto(usuario([Permiso.ProductosCrear])))).toBe(
      true,
    );
  });

  it("basta con tener uno de los permisos indicados", () => {
    reflector.getAllAndOverride.mockReturnValue([
      Permiso.RolesVer,
      Permiso.UsuariosAsignarRoles,
    ]);

    expect(
      guard.canActivate(contexto(usuario([Permiso.UsuariosAsignarRoles]))),
    ).toBe(true);
  });

  it("rechaza con 403 a quien no tiene ninguno", () => {
    reflector.getAllAndOverride.mockReturnValue([Permiso.ProductosEliminar]);

    expect(() =>
      guard.canActivate(contexto(usuario([Permiso.ProductosVer]))),
    ).toThrow(ForbiddenException);
  });

  it("el Administrador pasa siempre", () => {
    reflector.getAllAndOverride.mockReturnValue([Permiso.RolesEliminar]);

    expect(guard.canActivate(contexto(usuario([], true)))).toBe(true);
  });

  it("rechaza si no hay usuario autenticado", () => {
    reflector.getAllAndOverride.mockReturnValue([Permiso.ProductosVer]);

    expect(() => guard.canActivate(contexto())).toThrow(ForbiddenException);
  });

  it("no restringe nada si el handler no declara permisos", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contexto(usuario([])))).toBe(true);
  });
});
