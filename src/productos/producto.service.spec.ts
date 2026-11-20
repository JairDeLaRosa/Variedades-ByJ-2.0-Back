import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { ModoAjuste } from "./dtos/ajustar-stock.dto";
import { ProductoService } from "./producto.service";

const imagen = (n: number) => ({
  publicId: `docs/foto${n}`,
  url: `https://res.cloudinary.com/demo/image/upload/docs/foto${n}.jpg`,
});

describe("ProductoService", () => {
  // Cadena del QueryBuilder de TypeORM que usa ajustarStock.
  const consulta = {
    update: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };
  const productos = {
    createQueryBuilder: jest.fn(() => consulta),
    create: jest.fn((datos) => ({ ...datos })),
    save: jest.fn((producto) => Promise.resolve({ id: 1, ...producto })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
  };
  const files = { deleteFiles: jest.fn().mockResolvedValue(undefined) };

  let service: ProductoService;

  const dto = {
    nombre: "Piñata",
    descripcion: "Piñata para fiestas",
    categoria: "Piñateria",
    precioUnidad: 30000,
    stock: 10,
    descuento: 0,
    imagenes: [imagen(1), imagen(2)],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductoService(productos as never, files as never);
  });

  it("crea el producto con sus fotos como filas hijas", async () => {
    const res = await service.create(dto);

    expect(res.imagenes.map((i) => i.publicId)).toEqual([
      "docs/foto1",
      "docs/foto2",
    ]);
    expect(files.deleteFiles).not.toHaveBeenCalled();
  });

  it("responde 409 si una foto ya pertenece a otro producto", async () => {
    productos.save.mockRejectedValueOnce({ code: "23505" });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it("findAll filtra por categoría solo si se pide", async () => {
    await service.findAll("Piñateria");
    await service.findAll();

    expect(productos.find.mock.calls[0][0].where).toEqual({
      categoria: "Piñateria",
    });
    expect(productos.find.mock.calls[1][0].where).toEqual({});
  });

  describe("update", () => {
    const existente = () => ({
      id: 5,
      nombre: "viejo",
      imagenes: [
        { id: 10, ...imagen(1) },
        { id: 11, ...imagen(2) },
      ],
    });

    it("conserva las fotos que siguen y borra de Cloudinary las quitadas", async () => {
      productos.findOne.mockResolvedValue(existente());

      const res = await service.update(5, {
        ...dto,
        imagenes: [imagen(2), imagen(3)],
      });

      expect(res.imagenes.map((i) => i.publicId)).toEqual([
        "docs/foto2",
        "docs/foto3",
      ]);
      expect(res.imagenes[0]).toMatchObject({ id: 11 });
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/foto1"]);
    });

    it("no borra nada de Cloudinary si la base de datos falla", async () => {
      productos.findOne.mockResolvedValue(existente());
      productos.save.mockRejectedValueOnce(new Error("caída"));

      await expect(service.update(5, { ...dto, imagenes: [] })).rejects.toThrow(
        "caída",
      );
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });

    it("lanza 404 si el producto no existe", async () => {
      productos.findOne.mockResolvedValue(null);

      await expect(service.update(99, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("borra el producto y sus fotos de Cloudinary", async () => {
      productos.findOne.mockResolvedValue({
        id: 5,
        imagenes: [imagen(1), imagen(2)],
      });

      await service.remove(5);

      expect(productos.remove).toHaveBeenCalled();
      expect(files.deleteFiles).toHaveBeenCalledWith([
        "docs/foto1",
        "docs/foto2",
      ]);
    });

    it("no toca Cloudinary si la base de datos falla al borrar", async () => {
      productos.findOne.mockResolvedValue({ id: 5, imagenes: [imagen(1)] });
      productos.remove.mockRejectedValueOnce(new Error("caída"));

      await expect(service.remove(5)).rejects.toThrow("caída");
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });
  });

  describe("ajustarStock", () => {
    it("suma al stock actual en una sola sentencia", async () => {
      consulta.execute.mockResolvedValue({ affected: 1 });
      productos.findOne.mockResolvedValue({ id: 5, stock: 15 });

      const res = await service.ajustarStock(5, {
        modo: ModoAjuste.Sumar,
        cantidad: 10,
      });

      expect(res.stock).toBe(15);
      expect(consulta.set.mock.calls[0][0].stock()).toBe("stock + :cantidad");
      expect(consulta.setParameter).toHaveBeenCalledWith("cantidad", 10);
      expect(consulta.andWhere).toHaveBeenCalledWith(
        "stock + :cantidad <= :maximo",
        { maximo: 1_000_000 },
      );
    });

    it("resta solo si alcanza el stock", async () => {
      consulta.execute.mockResolvedValue({ affected: 1 });
      productos.findOne.mockResolvedValue({ id: 5, stock: 2 });

      await service.ajustarStock(5, { modo: ModoAjuste.Restar, cantidad: 3 });

      expect(consulta.set.mock.calls[0][0].stock()).toBe("stock - :cantidad");
      expect(consulta.andWhere).toHaveBeenCalledWith("stock >= :cantidad");
    });

    it("fija el stock en la cantidad indicada", async () => {
      consulta.execute.mockResolvedValue({ affected: 1 });
      productos.findOne.mockResolvedValue({ id: 5, stock: 7 });

      await service.ajustarStock(5, { modo: ModoAjuste.Fijar, cantidad: 7 });

      expect(consulta.set).toHaveBeenCalledWith({ stock: 7 });
      expect(consulta.andWhere).not.toHaveBeenCalled();
    });

    it("responde 400 si se resta más de lo que hay", async () => {
      consulta.execute.mockResolvedValue({ affected: 0 });
      productos.findOne.mockResolvedValue({ id: 5, stock: 2 });

      await expect(
        service.ajustarStock(5, { modo: ModoAjuste.Restar, cantidad: 9 }),
      ).rejects.toThrow(/quedan 2 unidades/);
    });

    it("responde 400 si la suma pasa del tope", async () => {
      consulta.execute.mockResolvedValue({ affected: 0 });
      productos.findOne.mockResolvedValue({ id: 5, stock: 999_999 });

      await expect(
        service.ajustarStock(5, { modo: ModoAjuste.Sumar, cantidad: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("lanza 404 si el producto no existe", async () => {
      consulta.execute.mockResolvedValue({ affected: 0 });
      productos.findOne.mockResolvedValue(null);

      await expect(
        service.ajustarStock(99, { modo: ModoAjuste.Sumar, cantidad: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
