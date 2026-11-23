import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { Usuario } from "./entities/usuario.entity";
import { Permiso, TODOS_LOS_PERMISOS } from "./permisos";

const rolAdmin = {
  id: 1,
  nombre: "Administrador",
  clave: "admin",
  permisos: [],
};
const rolVendedor = {
  id: 3,
  nombre: "Vendedor",
  clave: null,
  permisos: [{ permiso: Permiso.VentasVer }, { permiso: Permiso.ClientesVer }],
};

describe("AuthService", () => {
  const usuarios = {
    existsBy: jest.fn(),
    create: jest.fn((datos) => ({ id: 1, ...datos })),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const roles = { findOneBy: jest.fn() };
  const jwtService = { sign: jest.fn(() => "token-firmado") };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usuarios as never,
      roles as never,
      jwtService as never,
    );
  });

  describe("create", () => {
    const dto = {
      name: "Ana",
      email: "  Ana@Correo.com ",
      password: "secreto1",
      phone: "3001112233",
    };

    beforeEach(() => {
      usuarios.existsBy.mockResolvedValue(false);
      roles.findOneBy.mockResolvedValue({ id: 2, clave: "cliente" });
    });

    it("guarda el email normalizado, hashea la contraseña y asigna el rol de cliente", async () => {
      const res = await service.create(dto);

      const guardado = usuarios.save.mock.calls[0][0] as Usuario;
      expect(roles.findOneBy).toHaveBeenCalledWith({ clave: "cliente" });
      expect(guardado.email).toBe("ana@correo.com");
      expect(guardado.rolId).toBe(2);
      expect(guardado.password).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, guardado.password)).toBe(true);
      expect(res).toEqual({
        ok: true,
        id: 1,
        name: "Ana",
        token: "token-firmado",
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        uid: 1,
        name: "Ana",
        admin: false,
      });
    });

    it("rechaza un email ya registrado", async () => {
      usuarios.existsBy.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(usuarios.save).not.toHaveBeenCalled();
    });

    it("traduce la violación del índice único (registros simultáneos) a 409", async () => {
      usuarios.save.mockRejectedValue({ code: "23505" });

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("falla con claridad si no existe el rol de cliente", async () => {
      roles.findOneBy.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe("login", () => {
    const credenciales = async () => ({
      id: 1,
      password: await bcrypt.hash("secreto1", 4),
    });
    const usuario = (rol: unknown) => ({
      id: 1,
      name: "Ana",
      email: "ana@correo.com",
      phone: "3001112233",
      rol,
    });

    it("devuelve el usuario con su rol y permisos, sin contraseña", async () => {
      usuarios.findOne
        .mockResolvedValueOnce(await credenciales())
        .mockResolvedValueOnce(usuario(rolVendedor));

      const res = await service.login({
        email: "ANA@correo.com",
        password: "secreto1",
      });

      expect(usuarios.findOne.mock.calls[0][0].where).toEqual({
        email: "ana@correo.com",
      });
      expect(res.user).toEqual({
        id: 1,
        name: "Ana",
        phone: "3001112233",
        email: "ana@correo.com",
        rol: { id: 3, nombre: "Vendedor", clave: null },
        permisos: [Permiso.VentasVer, Permiso.ClientesVer],
        admin: false,
      });
      expect(res.user).not.toHaveProperty("password");
      expect(jwtService.sign).toHaveBeenCalledWith({
        uid: 1,
        name: "Ana",
        admin: false,
      });
    });

    it("el Administrador recibe todos los permisos", async () => {
      usuarios.findOne
        .mockResolvedValueOnce(await credenciales())
        .mockResolvedValueOnce(usuario(rolAdmin));

      const res = await service.login({
        email: "ana@correo.com",
        password: "secreto1",
      });

      expect(res.user.permisos).toEqual(TODOS_LOS_PERMISOS);
      expect(res.user.admin).toBe(true);
    });

    it("da el mismo error con email inexistente y con contraseña errónea", async () => {
      usuarios.findOne.mockResolvedValueOnce(null);
      const sinUsuario = await service
        .login({ email: "x@correo.com", password: "secreto1" })
        .catch((e: UnauthorizedException) => e);

      usuarios.findOne.mockResolvedValueOnce({
        id: 1,
        password: await bcrypt.hash("otra-clave", 4),
      });
      const claveMala = await service
        .login({ email: "ana@correo.com", password: "secreto1" })
        .catch((e: UnauthorizedException) => e);

      expect(sinUsuario).toBeInstanceOf(UnauthorizedException);
      expect(claveMala).toBeInstanceOf(UnauthorizedException);
      expect((sinUsuario as Error).message).toBe((claveMala as Error).message);
    });
  });

  describe("renewToken", () => {
    const actual = {
      uid: 1,
      name: "viejo",
      rolId: 1,
      rolNombre: "Administrador",
      esAdmin: true,
      permisos: TODOS_LOS_PERMISOS,
    };

    it("emite un token nuevo con los datos y permisos vigentes del usuario", async () => {
      usuarios.findOne.mockResolvedValue({
        id: 1,
        name: "Ana",
        email: "ana@correo.com",
        phone: "3001112233",
        rol: rolVendedor,
      });

      const res = await service.renewToken(actual);

      expect(res.ok).toBe(true);
      expect(res.token).toBe("token-firmado");
      expect(res.user.rol.nombre).toBe("Vendedor");
      expect(res.user.permisos).toEqual([
        Permiso.VentasVer,
        Permiso.ClientesVer,
      ]);
      expect(jwtService.sign).toHaveBeenCalledWith({
        uid: 1,
        name: "Ana",
        admin: false,
      });
    });

    it("rechaza si el usuario ya no existe", async () => {
      usuarios.findOne.mockResolvedValue(null);

      await expect(service.renewToken(actual)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
