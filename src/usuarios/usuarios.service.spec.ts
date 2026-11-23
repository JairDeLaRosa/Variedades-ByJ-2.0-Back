import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { Permiso, TODOS_LOS_PERMISOS } from "../auth/permisos";
import { UsuariosService } from "./usuarios.service";

const admin: AuthUser = {
  uid: 1,
  name: "Yo",
  rolId: 1,
  rolNombre: "Administrador",
  esAdmin: true,
  permisos: TODOS_LOS_PERMISOS,
};
const gerente = (permisos: Permiso[]): AuthUser => ({
  ...admin,
  uid: 5,
  rolId: 9,
  rolNombre: "Gerente",
  esAdmin: false,
  permisos,
});

const rol = (id: number, clave: string | null, permisos: Permiso[] = []) => ({
  id,
  nombre: `Rol ${id}`,
  clave,
  permisos: permisos.map((permiso) => ({ permiso })),
});
const ROL_ADMIN = rol(1, "admin");
const ROL_CLIENTE = rol(2, "cliente");
const ROL_VENDEDOR = rol(3, null, [Permiso.VentasVer, Permiso.ClientesVer]);

describe("UsuariosService", () => {
  const consulta = {
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
  };
  const usuarios = {
    createQueryBuilder: jest.fn(() => consulta),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn((u) => Promise.resolve(u)),
  };
  const roles = { findOne: jest.fn() };

  let service: UsuariosService;

  const usuario = (rolActual: object) => ({
    id: 2,
    rolId: (rolActual as { id: number }).id,
    rol: rolActual,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsuariosService(usuarios as never, roles as never);
  });

  describe("listar", () => {
    it("pagina con 20 por defecto y devuelve el total", async () => {
      const res = await service.listar({});

      expect(consulta.skip).toHaveBeenCalledWith(0);
      expect(consulta.take).toHaveBeenCalledWith(20);
      expect(res).toEqual({
        datos: [{ id: 1 }],
        total: 1,
        pagina: 1,
        limite: 20,
      });
    });

    it("trae solo id, nombre y clave del rol", async () => {
      await service.listar({});

      expect(consulta.addSelect).toHaveBeenCalledWith([
        "r.id",
        "r.nombre",
        "r.clave",
      ]);
    });

    it("calcula el salto según la página y el límite", async () => {
      await service.listar({ pagina: 3, limite: 10 });

      expect(consulta.skip).toHaveBeenCalledWith(20);
      expect(consulta.take).toHaveBeenCalledWith(10);
    });

    it("filtra por texto (sin comodines del usuario) y por rol", async () => {
      await service.listar({ q: "50%_a", rolId: 3 });

      expect(consulta.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        { q: "%50\\%\\_a%" },
      );
      expect(consulta.andWhere).toHaveBeenCalledWith("u.rolId = :rolId", {
        rolId: 3,
      });
    });

    it("sin filtros no agrega condiciones", async () => {
      await service.listar({});

      expect(consulta.andWhere).not.toHaveBeenCalled();
    });
  });

  describe("cambiarRol", () => {
    it("el Administrador pasa a un cliente a vendedor", async () => {
      usuarios.findOne.mockResolvedValue(usuario(ROL_CLIENTE));
      roles.findOne.mockResolvedValue(ROL_VENDEDOR);

      const res = await service.cambiarRol(admin, 2, 3);

      expect(res.rolId).toBe(3);
      expect(usuarios.save).toHaveBeenCalled();
    });

    it("no deja cambiar el propio rol", async () => {
      await expect(service.cambiarRol(admin, 1, 3)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(usuarios.save).not.toHaveBeenCalled();
    });

    it("responde 404 si el usuario o el rol no existen", async () => {
      usuarios.findOne.mockResolvedValue(null);
      await expect(service.cambiarRol(admin, 9, 3)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      usuarios.findOne.mockResolvedValue(usuario(ROL_CLIENTE));
      roles.findOne.mockResolvedValue(null);
      await expect(service.cambiarRol(admin, 2, 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("no guarda nada si ya tenía ese rol", async () => {
      usuarios.findOne.mockResolvedValue(usuario(ROL_VENDEDOR));
      roles.findOne.mockResolvedValue(ROL_VENDEDOR);

      await service.cambiarRol(admin, 2, 3);

      expect(usuarios.save).not.toHaveBeenCalled();
    });

    it("no deja dar un rol con permisos que quien asigna no tiene", async () => {
      usuarios.findOne.mockResolvedValue(usuario(ROL_CLIENTE));
      roles.findOne.mockResolvedValue(ROL_VENDEDOR);
      const actor = gerente([Permiso.UsuariosAsignarRoles, Permiso.VentasVer]);

      await expect(service.cambiarRol(actor, 2, 3)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(usuarios.save).not.toHaveBeenCalled();
    });

    it("no deja volverse Administrador dando el rol de Administrador", async () => {
      usuarios.findOne.mockResolvedValue(usuario(ROL_CLIENTE));
      roles.findOne.mockResolvedValue(ROL_ADMIN);
      const actor = gerente([Permiso.UsuariosAsignarRoles]);

      await expect(service.cambiarRol(actor, 2, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("no deja tocar a alguien con más permisos que quien asigna", async () => {
      usuarios.findOne.mockResolvedValue(usuario(ROL_ADMIN));
      roles.findOne.mockResolvedValue(ROL_CLIENTE);
      const actor = gerente([Permiso.UsuariosAsignarRoles]);

      await expect(service.cambiarRol(actor, 2, 2)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(usuarios.count).not.toHaveBeenCalled();
    });

    it("no quita el rol al último administrador", async () => {
      usuarios.findOne.mockResolvedValue(usuario(ROL_ADMIN));
      roles.findOne.mockResolvedValue(ROL_CLIENTE);
      usuarios.count.mockResolvedValue(1);

      await expect(service.cambiarRol(admin, 2, 2)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(usuarios.save).not.toHaveBeenCalled();
    });

    it("permite quitarle el rol a un administrador si queda otro", async () => {
      usuarios.findOne.mockResolvedValue(usuario(ROL_ADMIN));
      roles.findOne.mockResolvedValue(ROL_CLIENTE);
      usuarios.count.mockResolvedValue(2);

      const res = await service.cambiarRol(admin, 2, 2);

      expect(res.rolId).toBe(2);
    });
  });
});
