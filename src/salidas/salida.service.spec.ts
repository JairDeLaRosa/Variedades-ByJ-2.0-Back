import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Factura } from "../facturas/factura.entity";
import { SalidaService } from "./salida.service";

const imagen = (n: number) => ({
  publicId: `docs/img${n}`,
  url: `https://res.cloudinary.com/demo/image/upload/docs/img${n}.jpg`,
});

describe("SalidaService", () => {
  const consulta = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  // Consulta de lo ya pagado de la factura, dentro de la transacción.
  const consultaPagado = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };
  const manager = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => consultaPagado),
    save: jest.fn((salida) => Promise.resolve({ id: 1, ...salida })),
  };
  const salidas = {
    create: jest.fn((datos) => ({ ...datos })),
    save: jest.fn((salida) => Promise.resolve({ id: 1, ...salida })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => consulta),
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
      findOneBy: jest.fn(),
    },
  };
  // uploadAll devuelve img1, img2... según cuántos archivos lleguen.
  const files = {
    deleteFiles: jest.fn().mockResolvedValue(undefined),
    validarLote: jest.fn(),
    uploadAll: jest.fn((archivos: unknown[]) =>
      Promise.resolve(archivos.map((_, i) => imagen(i + 1))),
    ),
  };
  const archivo = () => ({ size: 100 }) as Express.Multer.File;

  let service: SalidaService;

  const dto = {
    fecha: "2025-03-10",
    total: 120000,
    proveedorId: 3,
    nota: "Arriendo de noviembre",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    salidas.findOne.mockReset();
    manager.findOne.mockReset();
    salidas.manager.findOneBy
      .mockReset()
      .mockResolvedValue({ id: 3, nombre: "Veneplas", activo: true });
    consultaPagado.getRawOne.mockReset();
    // Tras guardar, el service relee la salida: devuelve lo que se guardó.
    salidas.findOne.mockResolvedValue({ id: 1, imagenes: [] });
    service = new SalidaService(salidas as never, files as never);
  });

  describe("create", () => {
    it("sube los soportes y los guarda como filas hijas", async () => {
      const archivos = [archivo(), archivo()];

      await service.create(dto, archivos);

      expect(files.validarLote).toHaveBeenCalledWith(archivos, 0);
      const guardada = salidas.save.mock.calls[0][0];
      expect(
        guardada.imagenes.map((i: { publicId: string }) => i.publicId),
      ).toEqual(["docs/img1", "docs/img2"]);
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });

    it("devuelve la salida releída de la base con findOne", async () => {
      const releida = { id: 1, total: 120000, imagenes: [] };
      salidas.findOne.mockResolvedValue(releida);

      const res = await service.create(dto);

      expect(res).toBe(releida);
      expect(salidas.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it("guarda un pago libre sin factura con save directo, sin transacción", async () => {
      await service.create(dto);

      expect(salidas.save).toHaveBeenCalledWith(
        expect.objectContaining({
          facturaId: null,
          proveedorId: 3,
          nota: "Arriendo de noviembre",
          total: 120000,
        }),
      );
      expect(salidas.manager.transaction).not.toHaveBeenCalled();
    });

    it("la nota es opcional: sin ella se guarda null", async () => {
      await service.create({ ...dto, nota: undefined });

      expect(salidas.save).toHaveBeenCalledWith(
        expect.objectContaining({ proveedorId: 3, nota: null }),
      );
    });

    it("rechaza un proveedor que no existe en un pago libre, sin subir archivos", async () => {
      salidas.manager.findOneBy.mockResolvedValue(null);

      await expect(service.create(dto, [archivo()])).rejects.toThrow(
        /proveedor no existe/,
      );
      expect(files.uploadAll).not.toHaveBeenCalled();
    });

    it("rechaza un proveedor desactivado en un pago libre nuevo", async () => {
      salidas.manager.findOneBy.mockResolvedValue({ id: 3, activo: false });

      await expect(service.create(dto)).rejects.toThrow(/desactivado/);
      expect(salidas.save).not.toHaveBeenCalled();
    });

    it("con factura ignora el proveedor y lo guarda en null", async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 0,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "0" });

      await service.create({
        fecha: "2025-03-10",
        total: 60000,
        facturaId: 7,
        proveedorId: 3,
      });

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ facturaId: 7, proveedorId: null }),
      );
      expect(salidas.manager.findOneBy).not.toHaveBeenCalled();
    });

    it("guarda el pago de una factura cuando cabe dentro del saldo", async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 10000,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "50000" });

      await service.create({ fecha: "2025-03-10", total: 60000, facturaId: 7 });

      expect(salidas.manager.transaction).toHaveBeenCalledTimes(1);
      expect(manager.findOne).toHaveBeenCalledWith(Factura, {
        where: { id: 7 },
        lock: { mode: "pessimistic_write" },
        loadEagerRelations: false,
      });
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ facturaId: 7, total: 60000 }),
      );
      expect(salidas.save).not.toHaveBeenCalled();
    });

    it("permite pagar exactamente el saldo (total más interés menos lo pagado)", async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 10000,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "50000" });

      await service.create({ fecha: "2025-03-10", total: 60000, facturaId: 7 });

      expect(manager.save).toHaveBeenCalled();
    });

    it("responde 400 si el pago supera el saldo de la factura", async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 10000,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "50000" });

      await expect(
        service.create({ fecha: "2025-03-10", total: 60001, facturaId: 7 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it("cuenta el interés de la factura al calcular el saldo", async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 10000,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "0" });

      await service.create({
        fecha: "2025-03-10",
        total: 110000,
        facturaId: 7,
      });

      expect(manager.save).toHaveBeenCalled();
    });

    it("responde 400 'La factura no existe.' si el facturaId no existe", async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.create({ fecha: "2025-03-10", total: 1000, facturaId: 99 }),
      ).rejects.toThrow("La factura no existe.");
      expect(manager.save).not.toHaveBeenCalled();
    });

    it("al crear, la consulta de pagados excluye el id 0 (salida nueva)", async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 0,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "0" });

      await service.create({ fecha: "2025-03-10", total: 1000, facturaId: 7 });

      expect(consultaPagado.andWhere).toHaveBeenCalledWith(
        "s.id <> :salidaId",
        { salidaId: 0 },
      );
    });

    it("borra de Cloudinary lo recién subido si la base falla", async () => {
      salidas.save.mockRejectedValueOnce(new Error("caída"));

      await expect(service.create(dto, [archivo(), archivo()])).rejects.toThrow(
        "caída",
      );
      expect(files.deleteFiles).toHaveBeenCalledWith([
        "docs/img1",
        "docs/img2",
      ]);
    });

    it("borra lo recién subido si el pago supera el saldo", async () => {
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 1000,
        interesMonto: 0,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "0" });

      await expect(
        service.create({ fecha: "2025-03-10", total: 5000, facturaId: 7 }, [
          archivo(),
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img1"]);
    });

    it("responde 409 si un soporte ya pertenece a otra salida", async () => {
      salidas.save.mockRejectedValueOnce({ code: "23505" });

      await expect(service.create(dto, [archivo()])).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe("update", () => {
    const existente = () => ({
      id: 5,
      fecha: "2025-01-01",
      total: 1,
      facturaId: null,
      proveedorId: 3,
      nota: "vieja",
      imagenes: [
        { id: 10, ...imagen(1) },
        { id: 11, ...imagen(2) },
      ],
    });

    it("conserva los indicados, suma los nuevos y borra los quitados", async () => {
      salidas.findOne.mockResolvedValue(existente());
      files.uploadAll.mockResolvedValueOnce([imagen(3)]);

      await service.update(5, { ...dto, conservar: ["docs/img2"] }, [
        archivo(),
      ]);

      expect(files.validarLote).toHaveBeenCalledWith([expect.anything()], 1);
      const guardada = salidas.save.mock.calls[0][0];
      expect(
        guardada.imagenes.map((i: { publicId: string }) => i.publicId),
      ).toEqual(["docs/img2", "docs/img3"]);
      // El soporte que se conserva mantiene su fila (mismo id).
      expect(guardada.imagenes[0]).toMatchObject({ id: 11 });
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img1"]);
    });

    it("carga la salida con sus soportes y sin relaciones eager", async () => {
      salidas.findOne.mockResolvedValue(existente());

      await service.update(5, dto);

      expect(salidas.findOne).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: 5 },
          relations: { imagenes: true },
          loadEagerRelations: false,
        }),
      );
    });

    it("devuelve la salida releída con findOne tras guardar", async () => {
      const releida = { id: 5, imagenes: [] };
      salidas.findOne
        .mockResolvedValueOnce(existente())
        .mockResolvedValueOnce(releida);

      const res = await service.update(5, dto);

      expect(res).toBe(releida);
    });

    it("si la base falla borra solo lo recién subido, no lo anterior", async () => {
      salidas.findOne.mockResolvedValue(existente());
      files.uploadAll.mockResolvedValueOnce([imagen(3)]);
      salidas.save.mockRejectedValueOnce(new Error("caída"));

      await expect(
        service.update(5, { ...dto, conservar: ["docs/img1"] }, [archivo()]),
      ).rejects.toThrow("caída");
      expect(files.deleteFiles).toHaveBeenCalledTimes(1);
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img3"]);
    });

    it("responde 400 si conservar incluye un soporte ajeno", async () => {
      salidas.findOne.mockResolvedValue(existente());

      await expect(
        service.update(5, { ...dto, conservar: ["docs/otro"] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(files.uploadAll).not.toHaveBeenCalled();
    });

    it("lanza 404 si la salida no existe", async () => {
      salidas.findOne.mockResolvedValue(null);

      await expect(service.update(99, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("al editar un pago de factura excluye la propia salida del saldo", async () => {
      salidas.findOne.mockResolvedValue(existente());
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 0,
      });
      // Las demás salidas suman 40000: el saldo es 60000 sin contar la salida 5.
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "40000" });

      await service.update(5, {
        fecha: "2025-03-10",
        total: 60000,
        facturaId: 7,
      });

      expect(consultaPagado.andWhere).toHaveBeenCalledWith(
        "s.id <> :salidaId",
        { salidaId: 5 },
      );
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, facturaId: 7, total: 60000 }),
      );
    });

    it("al editar responde 400 si el nuevo monto supera el saldo", async () => {
      salidas.findOne.mockResolvedValue(existente());
      manager.findOne.mockResolvedValue({
        id: 7,
        total: 100000,
        interesMonto: 0,
      });
      consultaPagado.getRawOne.mockResolvedValue({ pagado: "40000" });

      await expect(
        service.update(5, { fecha: "2025-03-10", total: 60001, facturaId: 7 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("al quitar la factura de un pago pasa a guardarse como pago libre con su proveedor", async () => {
      salidas.findOne.mockResolvedValue({
        ...existente(),
        facturaId: 7,
        proveedorId: null,
      });

      await service.update(5, dto);

      expect(salidas.save).toHaveBeenCalledWith(
        expect.objectContaining({ facturaId: null, proveedorId: 3 }),
      );
      expect(salidas.manager.transaction).not.toHaveBeenCalled();
    });

    it("admite el proveedor actual aunque esté desactivado", async () => {
      salidas.findOne.mockResolvedValue(existente());
      salidas.manager.findOneBy.mockResolvedValue({ id: 3, activo: false });

      await service.update(5, dto);

      expect(salidas.save).toHaveBeenCalled();
    });

    it("no admite cambiar a un proveedor desactivado", async () => {
      salidas.findOne.mockResolvedValue(existente());
      salidas.manager.findOneBy.mockResolvedValue({ id: 4, activo: false });

      await expect(
        service.update(5, { ...dto, proveedorId: 4 }),
      ).rejects.toThrow(/desactivado/);
      expect(files.uploadAll).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("borra la salida y sus soportes de Cloudinary", async () => {
      salidas.findOne.mockResolvedValue({
        id: 5,
        imagenes: [imagen(1), imagen(2)],
      });

      await service.remove(5);

      expect(salidas.remove).toHaveBeenCalled();
      expect(files.deleteFiles).toHaveBeenCalledWith([
        "docs/img1",
        "docs/img2",
      ]);
    });

    it("lanza 404 si la salida no existe", async () => {
      salidas.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(salidas.remove).not.toHaveBeenCalled();
    });

    it("no toca Cloudinary si la base de datos falla al borrar", async () => {
      salidas.findOne.mockResolvedValue({ id: 5, imagenes: [imagen(1)] });
      salidas.remove.mockRejectedValueOnce(new Error("caída"));

      await expect(service.remove(5)).rejects.toThrow("caída");
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("lanza 404 si la salida no existe", async () => {
      salidas.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("getByMonth", () => {
    it("consulta el rango del mes incluyendo los soportes", async () => {
      await service.getByMonth("2025-12");

      expect(consulta.leftJoinAndSelect).toHaveBeenCalledWith(
        "salida.imagenes",
        "imagen",
      );
      expect(consulta.where.mock.calls[0][1]).toEqual({
        desde: "2025-12-01",
        hasta: "2026-01-01",
      });
    });

    it("incluye el proveedor del pago libre", async () => {
      await service.getByMonth("2025-03");

      expect(consulta.leftJoinAndSelect).toHaveBeenCalledWith(
        "salida.proveedorRef",
        "proveedorPago",
      );
    });

    it("incluye la factura de cada salida", async () => {
      await service.getByMonth("2025-03");

      expect(consulta.leftJoinAndSelect).toHaveBeenCalledWith(
        "salida.factura",
        "factura",
      );
    });

    it("incluye el proveedor de la factura", async () => {
      await service.getByMonth("2025-03");

      expect(consulta.leftJoinAndSelect).toHaveBeenCalledWith(
        "factura.proveedorRef",
        "proveedor",
      );
    });
  });
});
