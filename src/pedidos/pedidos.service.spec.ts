import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { Usuario } from "../auth/entities/usuario.entity";
import { Producto } from "../productos/producto.entity";
import { Pedido } from "./pedido.entity";
import { CanalPedido, EstadoPedido, MetodoPago } from "./pedido.constantes";
import { PedidosService } from "./pedidos.service";

const cliente = { id: 7, name: "Ana", phone: "3001112233" };
const actor: AuthUser = {
  uid: 7,
  name: "Ana",
  rolId: 2,
  rolNombre: "Cliente",
  esAdmin: false,
  permisos: [],
};
const producto = (
  id: number,
  nombre: string,
  precioUnidad: number,
  descuento = 0,
) => ({ id, nombre, precioUnidad, descuento, stock: 50 });

const pedidoBase = (extra: object = {}) => ({
  id: 10,
  usuarioId: 7,
  estado: EstadoPedido.Pendiente,
  metodoPago: MetodoPago.Transferencia,
  comprobantePagoPublicId: null,
  comprobantePagoUrl: null,
  items: [
    { id: 1, productoId: 1, nombre: "Piñata", cantidad: 3 },
    { id: 2, productoId: null, nombre: "Producto borrado", cantidad: 1 },
  ],
  ...extra,
});

describe("PedidosService", () => {
  const constructor = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((_entidad: unknown, datos: object) => ({ ...datos })),
    save: jest.fn((pedido: object) => Promise.resolve({ id: 10, ...pedido })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => constructor),
  };
  const dataSource = {
    transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
  };
  const consultaLista = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ monto: "5000" }),
    getManyAndCount: jest.fn().mockResolvedValue([[pedidoBase()], 1]),
  };
  const pedidos = {
    manager,
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => consultaLista),
  };
  const files = {
    validarLote: jest.fn(),
    uploadAll: jest.fn(),
    deleteFiles: jest.fn().mockResolvedValue(undefined),
  };

  let service: PedidosService;

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks no vacía los valores «una sola vez» que un test dejó sin
    // consumir (p. ej. cuando una transición se rechaza antes de la segunda
    // lectura): se reinician para que no se filtren al test siguiente.
    manager.findOne.mockReset();
    manager.find.mockReset();
    pedidos.find.mockReset();
    pedidos.findOne.mockReset();
    pedidos.save.mockReset();
    files.uploadAll.mockReset();
    constructor.execute.mockReset();
    manager.update.mockReset();
    constructor.execute.mockResolvedValue({ affected: 1 });
    manager.update.mockResolvedValue({ affected: 1 });
    service = new PedidosService(
      pedidos as never,
      dataSource as never,
      files as never,
    );
  });

  describe("crear", () => {
    const dto = {
      items: [
        { productoId: 1, cantidad: 2 },
        { productoId: 2, cantidad: 1 },
        { productoId: 1, cantidad: 1 },
      ],
      metodoPago: MetodoPago.Efectivo,
      nota: "Sin prisa",
    };

    beforeEach(() => {
      manager.findOne.mockImplementation((entidad: unknown) =>
        Promise.resolve(entidad === Usuario ? cliente : null),
      );
      manager.find.mockResolvedValue([
        producto(1, "Piñata estrella", 28000, 20),
        producto(2, "Marcadores", 15000),
      ]);
    });

    it("calcula precios y total con el catálogo, y suma las líneas repetidas", async () => {
      const res = await service.crear(actor, dto);

      expect(res.items).toEqual([
        expect.objectContaining({
          productoId: 1,
          nombre: "Piñata estrella",
          precioUnidad: 22400,
          cantidad: 3,
          subtotal: 67200,
        }),
        expect.objectContaining({
          productoId: 2,
          precioUnidad: 15000,
          cantidad: 1,
          subtotal: 15000,
        }),
      ]);
      expect(res.total).toBe(82200);
    });

    it("crea el pedido pendiente, de la tienda en línea, con los datos del cliente", async () => {
      const res = await service.crear(actor, dto);

      expect(manager.find).toHaveBeenCalledWith(
        Producto,
        expect.objectContaining({ where: expect.anything() }),
      );
      expect(res).toMatchObject({
        numero: "PED-0010",
        estado: "pendiente",
        canal: "web",
        metodoPago: "efectivo",
        nota: "Sin prisa",
        cliente: { id: 7, nombre: "Ana", telefono: "3001112233" },
      });
    });

    it("descuenta el stock de cada producto en una sola sentencia", async () => {
      await service.crear(actor, dto);

      expect(constructor.execute).toHaveBeenCalledTimes(2);
      expect(constructor.where).toHaveBeenCalledWith(
        "id = :id AND stock >= :cantidad",
        { id: 1, cantidad: 3 },
      );
      expect(constructor.where).toHaveBeenCalledWith(
        "id = :id AND stock >= :cantidad",
        { id: 2, cantidad: 1 },
      );
      expect(constructor.set.mock.calls[0][0].stock()).toBe(
        "stock - :cantidad",
      );
    });

    it("no crea nada si falta stock de un producto, y dice cuál", async () => {
      constructor.execute
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });
      manager.findOne.mockImplementation((entidad: unknown) =>
        Promise.resolve(entidad === Usuario ? cliente : { id: 2, stock: 0 }),
      );

      const error = await service.crear(actor, dto).catch((e) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(
        "No hay suficiente stock de «Marcadores»: quedan 0.",
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it("rechaza un producto que ya no existe, sin tocar el stock", async () => {
      manager.find.mockResolvedValue([producto(1, "Piñata estrella", 28000)]);

      await expect(service.crear(actor, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(constructor.execute).not.toHaveBeenCalled();
    });

    it("rechaza un pedido que supera el valor máximo", async () => {
      manager.find.mockResolvedValue([
        producto(1, "Caro", 1_500_000_000),
        producto(2, "Marcadores", 15000),
      ]);

      await expect(service.crear(actor, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(constructor.execute).not.toHaveBeenCalled();
    });
  });

  describe("cambiarEstado", () => {
    const pedirCambio = (
      desde: EstadoPedido,
      a: EstadoPedido,
      extra: object = {},
    ) => {
      // La primera lectura trae el pedido como estaba; la segunda, ya cambiado.
      // Se reemplaza la implementación en cada llamada para no dejar valores
      // sin consumir cuando la transición se rechaza.
      let lecturas = 0;
      manager.findOne.mockImplementation(() =>
        Promise.resolve(
          pedidoBase({ estado: lecturas++ === 0 ? desde : a, ...extra }),
        ),
      );
      return service.cambiarEstado(10, { estado: a });
    };

    it("avanza al siguiente estado usando el anterior como condición", async () => {
      const res = await pedirCambio(
        EstadoPedido.Pendiente,
        EstadoPedido.Confirmado,
      );

      expect(manager.update).toHaveBeenCalledWith(
        Pedido,
        { id: 10, estado: "pendiente" },
        { estado: "confirmado" },
      );
      expect(res.estado).toBe("confirmado");
      expect(constructor.execute).not.toHaveBeenCalled();
    });

    it("no deja saltarse pasos ni salir de un estado final", async () => {
      await expect(
        pedirCambio(EstadoPedido.Pendiente, EstadoPedido.Entregado),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        pedirCambio(EstadoPedido.Entregado, EstadoPedido.Cancelado),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        pedirCambio(EstadoPedido.Cancelado, EstadoPedido.Pendiente),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.update).not.toHaveBeenCalled();
    });

    it("al entregar asigna el número de comprobante y la fecha", async () => {
      await pedirCambio(EstadoPedido.Listo, EstadoPedido.Entregado);

      const cambios = manager.update.mock.calls[0][2];
      expect(cambios.estado).toBe("entregado");
      expect(cambios.entregadoEn).toBeInstanceOf(Date);
      expect(cambios.numeroComprobante()).toBe(
        "nextval('comprobante_numero_seq')",
      );
    });

    it("al cancelar devuelve el stock de las líneas con producto y marca la fecha", async () => {
      await pedirCambio(EstadoPedido.Confirmado, EstadoPedido.Cancelado);

      // Solo una línea tiene producto: la otra (borrado del catálogo) se salta.
      expect(constructor.execute).toHaveBeenCalledTimes(1);
      expect(constructor.where).toHaveBeenCalledWith("id = :id", {
        id: 1,
        cantidad: 3,
      });
      expect(constructor.set.mock.calls[0][0].stock()).toContain("LEAST");
      expect(manager.update.mock.calls[0][2].canceladoEn).toBeInstanceOf(Date);
    });

    it("avisa si otra persona cambió el pedido mientras tanto", async () => {
      manager.update.mockResolvedValue({ affected: 0 });

      await expect(
        pedirCambio(EstadoPedido.Pendiente, EstadoPedido.Confirmado),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("responde 404 si el pedido no existe", async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.cambiarEstado(99, { estado: EstadoPedido.Confirmado }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("cancelarMio", () => {
    it("busca el pedido solo entre los del cliente", async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.cancelarMio(actor, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(manager.findOne.mock.calls[0][1].where).toEqual({
        id: 10,
        usuarioId: 7,
      });
    });

    it("cancela un pedido pendiente y devuelve el stock", async () => {
      manager.findOne
        .mockResolvedValueOnce(pedidoBase())
        .mockResolvedValueOnce(pedidoBase({ estado: EstadoPedido.Cancelado }));

      const res = await service.cancelarMio(actor, 10);

      expect(res.estado).toBe("cancelado");
      expect(constructor.execute).toHaveBeenCalledTimes(1);
    });

    it("no deja cancelar uno que ya avanzó", async () => {
      manager.findOne.mockResolvedValueOnce(
        pedidoBase({ estado: EstadoPedido.Confirmado }),
      );

      await expect(service.cancelarMio(actor, 10)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(manager.update).not.toHaveBeenCalled();
    });
  });

  describe("subirComprobante", () => {
    const archivo = { size: 1000 } as Express.Multer.File;
    const subido = {
      publicId: "docs/nuevo",
      url: "https://res.cloudinary.com/x/nuevo.jpg",
    };

    beforeEach(() => {
      manager.findOne.mockResolvedValue(pedidoBase());
      files.uploadAll.mockResolvedValue([subido]);
      pedidos.save.mockImplementation((p: object) => Promise.resolve(p));
    });

    it("guarda el comprobante y borra el anterior", async () => {
      manager.findOne.mockResolvedValue(
        pedidoBase({ comprobantePagoPublicId: "docs/viejo" }),
      );

      const res = await service.subirComprobante(actor, 10, [archivo]);

      expect(res.comprobantePago).toEqual({ url: subido.url });
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/viejo"]);
    });

    it("pide exactamente un archivo", async () => {
      await expect(
        service.subirComprobante(actor, 10, []),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.subirComprobante(actor, 10, [archivo, archivo]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(files.uploadAll).not.toHaveBeenCalled();
    });

    it("solo aplica a pedidos que se pagan por transferencia", async () => {
      manager.findOne.mockResolvedValue(
        pedidoBase({ metodoPago: MetodoPago.Efectivo }),
      );

      await expect(
        service.subirComprobante(actor, 10, [archivo]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("no se acepta cuando el pedido ya está entregado o cancelado", async () => {
      manager.findOne.mockResolvedValue(
        pedidoBase({ estado: EstadoPedido.Entregado }),
      );

      await expect(
        service.subirComprobante(actor, 10, [archivo]),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(files.uploadAll).not.toHaveBeenCalled();
    });

    it("borra lo recién subido si la base falla", async () => {
      pedidos.save.mockRejectedValue(new Error("caída"));

      await expect(
        service.subirComprobante(actor, 10, [archivo]),
      ).rejects.toThrow("caída");
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/nuevo"]);
    });
  });

  describe("ventas", () => {
    const vendido = pedidoBase({
      id: 31,
      usuarioId: null,
      canal: CanalPedido.Mostrador,
      estado: EstadoPedido.Entregado,
      numeroComprobante: 5,
      items: [{ id: 1, productoId: 1, nombre: "Piñata", cantidad: 2 }],
    });

    it("registrarVenta nace entregada, sin cliente, con stock descontado y comprobante", async () => {
      manager.find.mockResolvedValue([producto(1, "Piñata", 10000, 10)]);
      manager.findOne.mockResolvedValue(vendido);

      const res = await service.registrarVenta({
        items: [{ productoId: 1, cantidad: 2 }],
        metodoPago: MetodoPago.Efectivo,
      });

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: null,
          canal: CanalPedido.Mostrador,
          estado: EstadoPedido.Entregado,
          clienteNombre: "Cliente de mostrador",
          total: 18000,
        }),
      );
      expect(constructor.execute).toHaveBeenCalledTimes(1);
      expect(manager.update).toHaveBeenCalledWith(
        Pedido,
        { id: 10 },
        { numeroComprobante: expect.any(Function) },
      );
      expect(res.comprobante).toBe("CV-000005");
      expect(res.estado).toBe(EstadoPedido.Entregado);
    });

    it("registrarVenta no vende si falta stock", async () => {
      manager.find.mockResolvedValue([producto(1, "Piñata", 10000)]);
      constructor.execute.mockResolvedValue({ affected: 0 });
      manager.findOne.mockResolvedValue({ id: 1, stock: 1 });

      await expect(
        service.registrarVenta({
          items: [{ productoId: 1, cantidad: 5 }],
          metodoPago: MetodoPago.Efectivo,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it("listarVentas solo trae entregados y suma el monto", async () => {
      const res = await service.listarVentas({ canal: CanalPedido.Web });

      expect(consultaLista.where).toHaveBeenCalledWith(
        "p.estado = :entregado",
        { entregado: "entregado" },
      );
      expect(consultaLista.andWhere).toHaveBeenCalledWith("p.canal = :canal", {
        canal: "web",
      });
      expect(res).toMatchObject({ total: 1, monto: 5000, limite: 20 });
    });

    it("listarVentas busca un comprobante por su número", async () => {
      await service.listarVentas({ q: "CV-000012" });

      expect(consultaLista.andWhere).toHaveBeenCalledWith(
        "p.numeroComprobante = :comprobante",
        { comprobante: 12 },
      );
    });

    it("obtenerVenta responde 404 si no existe o no está entregada", async () => {
      pedidos.findOne.mockResolvedValue(null);

      await expect(service.obtenerVenta(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(pedidos.findOne.mock.calls[0][0].where).toEqual({
        id: 9,
        estado: "entregado",
      });
    });
  });

  describe("consultas", () => {
    it("listarMios trae solo los del cliente, del más reciente al más antiguo", async () => {
      pedidos.find.mockResolvedValue([pedidoBase()]);

      const res = await service.listarMios(actor);

      expect(pedidos.find.mock.calls[0][0].where).toEqual({ usuarioId: 7 });
      expect(res).toHaveLength(1);
    });

    it("listar pagina con 20 por defecto y devuelve el total", async () => {
      const res = await service.listar({});

      expect(consultaLista.skip).toHaveBeenCalledWith(0);
      expect(consultaLista.take).toHaveBeenCalledWith(20);
      expect(res).toMatchObject({ total: 1, pagina: 1, limite: 20 });
    });

    it("filtra por estado", async () => {
      await service.listar({ estado: EstadoPedido.Listo });

      expect(consultaLista.andWhere).toHaveBeenCalledWith(
        "p.estado = :estado",
        {
          estado: "listo",
        },
      );
    });

    it("si el texto es un número de pedido busca por id", async () => {
      await service.listar({ q: "PED-0012" });

      expect(consultaLista.andWhere).toHaveBeenCalledWith("p.id = :id", {
        id: 12,
      });
    });

    it("si es un nombre busca por texto, sin comodines del usuario", async () => {
      await service.listar({ q: "50%_a" });

      expect(consultaLista.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        { q: "%50\\%\\_a%" },
      );
    });

    it("obtener responde 404 si no existe", async () => {
      pedidos.findOne.mockResolvedValue(null);

      await expect(service.obtener(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
