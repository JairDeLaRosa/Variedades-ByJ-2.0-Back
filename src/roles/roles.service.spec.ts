import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import {
  CATALOGO_PERMISOS,
  Permiso,
  TODOS_LOS_PERMISOS,
} from "../auth/permisos";
import { RolesService } from "./roles.service";

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

const rolGuardado = (extra: object = {}) => ({
  id: 3,
  nombre: "Vendedor",
  descripcion: "Atiende",
  clave: null,
  permisos: [
    { rolId: 3, permiso: Permiso.VentasVer },
    { rolId: 3, permiso: Permiso.ClientesVer },
  ],
  ...extra,
});

describe("RolesService", () => {
  const consultaNombre = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn().mockResolvedValue(false),
  };
  const consultaCuentas = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ rolId: 3, total: "2" }]),
  };
  const roles = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((datos) => ({ id: 10, ...datos })),
    save: jest.fn((rol) => Promise.resolve(rol)),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => consultaNombre),
  };
  const usuarios = {
    createQueryBuilder: jest.fn(() => consultaCuentas),
    countBy: jest.fn().mockResolvedValue(0),
  };

  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    consultaNombre.getExists.mockResolvedValue(false);
    service = new RolesService(roles as never, usuarios as never);
  });

  it("el catálogo es el de permisos.ts", () => {
    expect(service.catalogo()).toBe(CATALOGO_PERMISOS);
  });

  describe("listar", () => {
    it("trae los permisos y cuántos usuarios tiene cada rol", async () => {
      roles.find.mockResolvedValue([
        {
          id: 1,
          nombre: "Administrador",
          descripcion: "",
          clave: "admin",
          permisos: [],
        },
        rolGuardado(),
        {
          id: 2,
          nombre: "Cliente",
          descripcion: "",
          clave: "cliente",
          permisos: [],
        },
      ]);

      const res = await service.listar();

      expect(res.map((r) => [r.nombre, r.usuarios])).toEqual([
        ["Administrador", 0],
        ["Vendedor", 2],
        ["Cliente", 0],
      ]);
      expect(res[0].permisos).toEqual(TODOS_LOS_PERMISOS);
      expect(res[1].permisos).toEqual([Permiso.VentasVer, Permiso.ClientesVer]);
    });
  });

  describe("crear", () => {
    const dto = {
      nombre: "Bodeguero",
      descripcion: "Maneja el stock",
      permisos: [Permiso.InventarioVer, Permiso.InventarioAjustar],
    };

    it("crea un rol sin clave con sus permisos", async () => {
      const res = await service.crear(admin, dto);

      const creado = roles.create.mock.calls[0][0];
      expect(creado.clave).toBeNull();
      expect(
        creado.permisos.map((p: { permiso: Permiso }) => p.permiso),
      ).toEqual(dto.permisos);
      expect(res).toMatchObject({
        nombre: "Bodeguero",
        permisos: dto.permisos,
        usuarios: 0,
      });
    });

    it("no deja dar permisos que quien crea no tiene", async () => {
      const actor = gerente([Permiso.RolesCrear, Permiso.InventarioVer]);

      await expect(service.crear(actor, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(roles.save).not.toHaveBeenCalled();
    });

    it("rechaza un nombre repetido, sin importar mayúsculas", async () => {
      consultaNombre.getExists.mockResolvedValue(true);

      await expect(service.crear(admin, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(consultaNombre.where.mock.calls[0][0]).toContain("LOWER");
    });

    it("traduce la violación del índice único a 409", async () => {
      roles.save.mockRejectedValueOnce({ code: "23505" });

      await expect(service.crear(admin, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("actualizar", () => {
    const dto = {
      nombre: "Vendedor senior",
      descripcion: "",
      permisos: [Permiso.VentasVer, Permiso.VentasRegistrar],
    };

    it("conserva las filas de los permisos que siguen y agrega los nuevos", async () => {
      const rol = rolGuardado();
      const filaQueSigue = rol.permisos[0];
      roles.findOne.mockResolvedValue(rol);

      const res = await service.actualizar(admin, 3, dto);

      const guardado = roles.save.mock.calls[0][0];
      expect(guardado.permisos[0]).toBe(filaQueSigue);
      expect(
        guardado.permisos.map((p: { permiso: Permiso }) => p.permiso),
      ).toEqual(dto.permisos);
      expect(res.nombre).toBe("Vendedor senior");
    });

    it("permite quitar permisos aunque quien edita no los tenga", async () => {
      roles.findOne.mockResolvedValue(rolGuardado());
      const actor = gerente([Permiso.RolesEditar]);

      await expect(
        service.actualizar(actor, 3, { ...dto, permisos: [] }),
      ).resolves.toBeDefined();
    });

    it("no deja agregar un permiso que quien edita no tiene", async () => {
      roles.findOne.mockResolvedValue(rolGuardado());
      const actor = gerente([Permiso.RolesEditar, Permiso.VentasVer]);

      await expect(service.actualizar(actor, 3, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(roles.save).not.toHaveBeenCalled();
    });

    it("no modifica los roles del sistema", async () => {
      roles.findOne.mockResolvedValue(rolGuardado({ clave: "admin" }));

      await expect(service.actualizar(admin, 1, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("responde 404 si el rol no existe", async () => {
      roles.findOne.mockResolvedValue(null);

      await expect(service.actualizar(admin, 99, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("comprueba el nombre sin contar el propio rol", async () => {
      roles.findOne.mockResolvedValue(rolGuardado());

      await service.actualizar(admin, 3, dto);

      expect(consultaNombre.andWhere).toHaveBeenCalledWith(
        "r.id <> :exceptoId",
        { exceptoId: 3 },
      );
    });
  });

  describe("eliminar", () => {
    it("borra un rol sin usuarios", async () => {
      const rol = rolGuardado();
      roles.findOne.mockResolvedValue(rol);

      await service.eliminar(3);

      expect(roles.remove).toHaveBeenCalledWith(rol);
    });

    it("no borra un rol que todavía tiene usuarios", async () => {
      roles.findOne.mockResolvedValue(rolGuardado());
      usuarios.countBy.mockResolvedValue(2);

      await expect(service.eliminar(3)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(roles.remove).not.toHaveBeenCalled();
    });

    it("no borra los roles del sistema", async () => {
      roles.findOne.mockResolvedValue(rolGuardado({ clave: "cliente" }));

      await expect(service.eliminar(2)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("responde 404 si no existe", async () => {
      roles.findOne.mockResolvedValue(null);

      await expect(service.eliminar(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
