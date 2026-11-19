import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { Usuario } from "./entities/usuario.entity";

describe("AuthService", () => {
  const usuarios = {
    existsBy: jest.fn(),
    create: jest.fn((datos) => ({ id: 1, ...datos })),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };
  const jwtService = { sign: jest.fn(() => "token-firmado") };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usuarios as never, jwtService as never);
  });

  describe("create", () => {
    const dto = {
      name: "Ana",
      email: "  Ana@Correo.com ",
      password: "secreto1",
      phone: "3001112233",
    };

    it("guarda el email normalizado, hashea la contraseña y no crea admins", async () => {
      usuarios.existsBy.mockResolvedValue(false);

      const res = await service.create(dto);

      const guardado = usuarios.save.mock.calls[0][0] as Usuario;
      expect(guardado.email).toBe("ana@correo.com");
      expect(guardado.admin).toBe(false);
      expect(guardado.password).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, guardado.password)).toBe(true);
      expect(res).toEqual({
        ok: true,
        id: 1,
        name: "Ana",
        token: "token-firmado",
      });
    });

    it("rechaza un email ya registrado", async () => {
      usuarios.existsBy.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(usuarios.save).not.toHaveBeenCalled();
    });

    it("traduce la violación del índice único a 409 (registros simultáneos)", async () => {
      usuarios.existsBy.mockResolvedValue(false);
      usuarios.save.mockRejectedValue({ code: "23505" });

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("login", () => {
    it("devuelve el usuario sin contraseña y un token con el rol", async () => {
      usuarios.findOne.mockResolvedValue({
        id: 1,
        name: "Ana",
        email: "ana@correo.com",
        phone: "3001112233",
        admin: true,
        password: await bcrypt.hash("secreto1", 4),
      });

      const res = await service.login({
        email: "ANA@correo.com",
        password: "secreto1",
      });

      expect(usuarios.findOne.mock.calls[0][0].where).toEqual({
        email: "ana@correo.com",
      });
      expect(res.user).toEqual({
        name: "Ana",
        phone: "3001112233",
        email: "ana@correo.com",
        admin: true,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        uid: 1,
        name: "Ana",
        admin: true,
      });
    });

    it("da el mismo error con email inexistente y con contraseña errónea", async () => {
      usuarios.findOne.mockResolvedValueOnce(null);
      const sinUsuario = await service
        .login({ email: "x@correo.com", password: "secreto1" })
        .catch((e: UnauthorizedException) => e);

      usuarios.findOne.mockResolvedValueOnce({
        id: 1,
        name: "Ana",
        admin: false,
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
    it("emite un token nuevo con los datos actuales del usuario", async () => {
      usuarios.findOneBy.mockResolvedValue({
        id: 1,
        name: "Ana",
        admin: false,
      });

      const res = await service.renewToken({
        uid: 1,
        name: "viejo",
        admin: true,
      });

      expect(res).toEqual({ ok: true, token: "token-firmado" });
      expect(jwtService.sign).toHaveBeenCalledWith({
        uid: 1,
        name: "Ana",
        admin: false,
      });
    });

    it("rechaza si el usuario ya no existe", async () => {
      usuarios.findOneBy.mockResolvedValue(null);

      await expect(
        service.renewToken({ uid: 1, name: "Ana", admin: false }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
