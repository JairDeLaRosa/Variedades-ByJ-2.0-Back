import { ConflictException, NotFoundException } from "@nestjs/common";
import { VentasService } from "./ventas.service";

describe("VentasService", () => {
  const consulta = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const ventas = {
    findOneBy: jest.fn(),
    create: jest.fn((datos) => ({ ...datos })),
    save: jest.fn((venta) => Promise.resolve({ id: 1, ...venta })),
    find: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => consulta),
  };

  let service: VentasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VentasService(ventas as never);
  });

  describe("create", () => {
    const dto = {
      fecha: "2025-03-10",
      totalPinateria: 100000,
      totalPapeleria: 50000,
    };

    it("crea el día calculando el total en el servidor", async () => {
      ventas.findOneBy.mockResolvedValue(null);

      const res = await service.create(dto);

      expect(res.msg).toBe("Registro creado.");
      expect(res.data).toMatchObject({
        id: 1,
        fecha: "2025-03-10",
        total: 150000,
      });
    });

    it("actualiza el día si ya existía, conservando su id", async () => {
      ventas.findOneBy.mockResolvedValue({
        id: 7,
        fecha: "2025-03-10",
        total: 1,
        totalPinateria: 1,
        totalPapeleria: 0,
      });

      const res = await service.create(dto);

      expect(res.msg).toBe("Registro actualizado.");
      expect(res.data).toMatchObject({ id: 7, total: 150000 });
    });

    it("responde 409 si otro cierre del mismo día se guardó antes", async () => {
      ventas.findOneBy.mockResolvedValue(null);
      ventas.save.mockRejectedValueOnce({ code: "23505" });

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("getByMonth", () => {
    it("consulta el rango [primer día, primer día del mes siguiente)", async () => {
      await service.getByMonth("2025-03");

      expect(consulta.where.mock.calls[0][1]).toEqual({
        desde: "2025-03-01",
        hasta: "2025-04-01",
      });
    });

    it("pasa de diciembre a enero del año siguiente", async () => {
      await service.getByMonth("2025-12");

      expect(consulta.where.mock.calls[0][1]).toEqual({
        desde: "2025-12-01",
        hasta: "2026-01-01",
      });
    });
  });

  describe("findOne / remove", () => {
    it("findOne lanza 404 si no existe", async () => {
      ventas.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("remove lanza 404 si no borró nada", async () => {
      ventas.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("remove borra la venta existente", async () => {
      ventas.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(ventas.delete).toHaveBeenCalledWith({ id: 1 });
    });
  });
});
