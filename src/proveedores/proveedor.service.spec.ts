import { ConflictException, NotFoundException } from "@nestjs/common";
import { ProveedorService } from "./proveedor.service";

const proveedor = (datos: Record<string, unknown> = {}) => ({
  id: 1,
  nombre: "Papelería Central",
  nit: null,
  contacto: null,
  telefono: null,
  email: null,
  direccion: null,
  notas: null,
  activo: true,
  ...datos,
});

describe("ProveedorService", () => {
  const consulta = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const repo = {
    create: jest.fn((datos) => ({ ...datos })),
    save: jest.fn((p) => Promise.resolve({ id: 1, ...p })),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => consulta),
  };
  const facturaService = { findAll: jest.fn() };

  let service: ProveedorService;

  beforeEach(() => {
    jest.clearAllMocks();
    consulta.getMany.mockReset().mockResolvedValue([]);
    repo.query.mockReset().mockResolvedValue([]);
    repo.findOneBy.mockReset().mockResolvedValue(proveedor());
    facturaService.findAll.mockReset().mockResolvedValue([]);
    service = new ProveedorService(repo as never, facturaService as never);
  });

  describe("create", () => {
    it("solo exige el nombre: lo demás queda en null y queda activo", async () => {
      await service.create({ nombre: "Veneplas" });

      expect(repo.create).toHaveBeenCalledWith({
        nombre: "Veneplas",
        nit: null,
        contacto: null,
        telefono: null,
        email: null,
        direccion: null,
        notas: null,
        activo: true,
      });
    });

    it("guarda los datos opcionales que vienen", async () => {
      await service.create({
        nombre: "Veneplas",
        nit: "900.123-4",
        email: "ventas@veneplas.co",
        activo: false,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nit: "900.123-4",
          email: "ventas@veneplas.co",
          activo: false,
        }),
      );
    });

    it("responde 409 si el nombre ya existe", async () => {
      repo.save.mockRejectedValueOnce({ code: "23505" });

      await expect(service.create({ nombre: "Veneplas" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("une cada proveedor con su número de facturas y su saldo", async () => {
      consulta.getMany.mockResolvedValue([
        proveedor({ id: 1 }),
        proveedor({ id: 2, nombre: "Veneplas" }),
      ]);
      repo.query.mockResolvedValue([
        {
          proveedorId: 1,
          facturas: "2",
          facturado: "300000",
          pagado: "100000",
        },
      ]);

      const res = await service.findAll();

      expect(repo.query.mock.calls[0][1]).toEqual([[1, 2]]);
      expect(res).toEqual([
        expect.objectContaining({ id: 1, totalFacturas: 2, saldo: 200000 }),
        expect.objectContaining({ id: 2, totalFacturas: 0, saldo: 0 }),
      ]);
    });

    it("no consulta los saldos si no hay proveedores", async () => {
      await service.findAll();

      expect(repo.query).not.toHaveBeenCalled();
    });

    it("filtra por activo y escapa los comodines de LIKE", async () => {
      await service.findAll({ activo: false, buscar: "100%_a" });

      expect(consulta.andWhere).toHaveBeenCalledWith("p.activo = :activo", {
        activo: false,
      });
      expect(consulta.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("p.nombre ILIKE :buscar"),
        { buscar: "%100\\%\\_a%" },
      );
    });
  });

  describe("findOne", () => {
    it("lanza 404 si no existe", async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(9)).rejects.toThrow(NotFoundException);
    });

    it("trae el resumen y las facturas del proveedor", async () => {
      repo.query.mockResolvedValue([
        { proveedorId: 1, facturas: "1", facturado: "50000", pagado: "20000" },
      ]);
      facturaService.findAll.mockResolvedValue([{ id: 4 }]);

      const res = await service.findOne(1);

      expect(facturaService.findAll).toHaveBeenCalledWith({ proveedorId: 1 });
      expect(res.resumen).toEqual({
        facturas: 1,
        facturado: 50000,
        pagado: 20000,
        saldo: 30000,
      });
      expect(res.facturas).toEqual([{ id: 4 }]);
    });

    it("sin facturas el resumen va en cero", async () => {
      const res = await service.findOne(1);

      expect(res.resumen).toEqual({
        facturas: 0,
        facturado: 0,
        pagado: 0,
        saldo: 0,
      });
    });
  });

  describe("update", () => {
    it("reemplaza los datos y conserva activo si no viene", async () => {
      repo.findOneBy.mockResolvedValue(
        proveedor({ activo: false, nit: "viejo" }),
      );

      const res = await service.update(1, { nombre: "Nuevo" });

      expect(res).toMatchObject({ nombre: "Nuevo", nit: null, activo: false });
    });

    it("permite reactivarlo", async () => {
      repo.findOneBy.mockResolvedValue(proveedor({ activo: false }));

      const res = await service.update(1, { nombre: "X", activo: true });

      expect(res.activo).toBe(true);
    });

    it("responde 409 si el nombre choca con otro proveedor", async () => {
      repo.save.mockRejectedValueOnce({ code: "23505" });

      await expect(service.update(1, { nombre: "Veneplas" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("remove", () => {
    it("lanza 404 si no existe", async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(9)).rejects.toThrow(NotFoundException);
    });

    it("responde 409 pidiendo desactivarlo si tiene facturas", async () => {
      repo.remove.mockRejectedValueOnce({ code: "23503" });

      await expect(service.remove(1)).rejects.toThrow(/desactívalo/);
    });

    it("lo borra si no tiene facturas", async () => {
      await service.remove(1);

      expect(repo.remove).toHaveBeenCalled();
    });
  });
});
