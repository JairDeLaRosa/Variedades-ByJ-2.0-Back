import { ConflictException, NotFoundException } from "@nestjs/common";
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
  const salidas = {
    create: jest.fn((datos) => ({ ...datos })),
    save: jest.fn((salida) => Promise.resolve({ id: 1, ...salida })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => consulta),
  };
  const files = { deleteFiles: jest.fn().mockResolvedValue(undefined) };

  let service: SalidaService;

  const dto = {
    fecha: "2025-03-10",
    total: 120000,
    factura: "F-100",
    tienda: "Papelería Central",
    imagenes: [imagen(1), imagen(2)],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SalidaService(salidas as never, files as never);
  });

  it("crea la salida con sus soportes como filas hijas", async () => {
    const res = await service.create(dto);

    expect(res.imagenes.map((i) => i.publicId)).toEqual([
      "docs/img1",
      "docs/img2",
    ]);
    expect(files.deleteFiles).not.toHaveBeenCalled();
  });

  it("responde 409 si un soporte ya pertenece a otra salida", async () => {
    salidas.save.mockRejectedValueOnce({ code: "23505" });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  describe("update", () => {
    const existente = () => ({
      id: 5,
      fecha: "2025-01-01",
      total: 1,
      factura: "vieja",
      tienda: "vieja",
      imagenes: [
        { id: 10, ...imagen(1) },
        { id: 11, ...imagen(2) },
      ],
    });

    it("conserva los soportes que siguen y borra de Cloudinary los quitados", async () => {
      salidas.findOne.mockResolvedValue(existente());

      const res = await service.update(5, {
        ...dto,
        imagenes: [imagen(2), imagen(3)],
      });

      expect(res.imagenes.map((i) => i.publicId)).toEqual([
        "docs/img2",
        "docs/img3",
      ]);
      // El soporte que se conserva mantiene su fila (mismo id).
      expect(res.imagenes[0]).toMatchObject({ id: 11 });
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img1"]);
    });

    it("no borra nada de Cloudinary si la base de datos falla", async () => {
      salidas.findOne.mockResolvedValue(existente());
      salidas.save.mockRejectedValueOnce(new Error("caída"));

      await expect(service.update(5, { ...dto, imagenes: [] })).rejects.toThrow(
        "caída",
      );
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });

    it("lanza 404 si la salida no existe", async () => {
      salidas.findOne.mockResolvedValue(null);

      await expect(service.update(99, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
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

    it("no toca Cloudinary si la base de datos falla al borrar", async () => {
      salidas.findOne.mockResolvedValue({ id: 5, imagenes: [imagen(1)] });
      salidas.remove.mockRejectedValueOnce(new Error("caída"));

      await expect(service.remove(5)).rejects.toThrow("caída");
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });
  });

  it("getByMonth consulta el rango del mes incluyendo los soportes", async () => {
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
});
