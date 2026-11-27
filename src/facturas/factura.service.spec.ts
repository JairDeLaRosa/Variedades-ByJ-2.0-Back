import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { CreateFacturaDto } from "./dtos/create-factura.dto";
import { FacturaCuota } from "./factura-cuota.entity";
import { Factura } from "./factura.entity";
import { FacturaService } from "./factura.service";

const imagen = (n: number) => ({
  publicId: `docs/img${n}`,
  url: `https://res.cloudinary.com/demo/image/upload/docs/img${n}.jpg`,
});

// Mediodía del 25 de noviembre de 2026 en Colombia (UTC-5).
const AHORA = "2026-11-25T17:00:00Z";

const crearFactura = (datos: Record<string, unknown> = {}) => ({
  id: 1,
  numero: "F-1",
  proveedorId: 1,
  proveedor: "Papelería Central",
  fecha: "2026-11-01",
  total: 100000,
  modalidad: "libre",
  vence: null,
  periodicidad: null,
  interesPorcentaje: 0,
  interesMonto: 0,
  notas: null,
  cuotas: [],
  imagenes: [],
  createdAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-01T00:00:00Z"),
  ...datos,
});

const crearDto = (datos: Partial<CreateFacturaDto> = {}): CreateFacturaDto => ({
  numero: "F-1",
  proveedorId: 1,
  fecha: "2026-11-01",
  total: 100000,
  modalidad: "libre",
  ...datos,
});

/** Cuatro cuotas mensuales de 25000 desde el 1 de diciembre de 2026. */
const cuotasGuardadas = () => [
  { numero: 1, vence: "2026-12-01", monto: 25000 },
  { numero: 2, vence: "2027-01-01", monto: 25000 },
  { numero: 3, vence: "2027-02-01", monto: 25000 },
  { numero: 4, vence: "2027-03-01", monto: 25000 },
];

const dtoCuotas = (datos: Partial<CreateFacturaDto> = {}) =>
  crearDto({
    modalidad: "cuotas",
    total: 100000,
    numeroCuotas: 4,
    periodicidad: "mensual",
    primeraCuota: "2026-12-01",
    ...datos,
  });

describe("FacturaService", () => {
  // Consulta de facturas con cuotas (listado y resumen).
  const consultaFacturas = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  // Consulta de lo pagado por factura (una sola para todas).
  const consultaPagados = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  // Consultas dentro de la transacción de update.
  const consultaTx = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
    getRawOne: jest.fn(),
  };
  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((f) => Promise.resolve(f)),
    createQueryBuilder: jest.fn(() => consultaTx),
  };
  const facturas = {
    create: jest.fn((datos) => ({ ...datos })),
    save: jest.fn((f) => Promise.resolve({ id: 1, ...f })),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => consultaFacturas),
    manager: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
      find: jest.fn(),
      findOneBy: jest.fn(),
    },
  };
  const salidas = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => consultaPagados),
  };
  const files = {
    deleteFiles: jest.fn().mockResolvedValue(undefined),
    validarLote: jest.fn(),
    uploadAll: jest.fn((archivos: unknown[]) =>
      Promise.resolve(archivos.map((_, i) => imagen(i + 1))),
    ),
  };
  const archivo = () => ({ size: 100 }) as Express.Multer.File;

  let service: FacturaService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(AHORA));

    consultaFacturas.getMany.mockReset().mockResolvedValue([]);
    consultaPagados.getRawMany.mockReset().mockResolvedValue([]);
    consultaTx.getRawOne
      .mockReset()
      .mockResolvedValue({ pagado: "0", pagos: "0" });
    manager.findOne.mockReset();
    manager.find.mockReset();
    facturas.findOne.mockReset().mockResolvedValue(crearFactura());
    facturas.manager.find.mockReset();
    facturas.manager.findOneBy
      .mockReset()
      .mockResolvedValue({ id: 1, nombre: "Papelería Central", activo: true });
    salidas.find.mockReset().mockResolvedValue([]);
    salidas.count.mockReset().mockResolvedValue(0);

    service = new FacturaService(
      facturas as never,
      salidas as never,
      files as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("create", () => {
    it("guarda la factura sin número como null", async () => {
      await service.create(crearDto({ numero: undefined }));

      expect(facturas.save.mock.calls[0][0]).toMatchObject({ numero: null });
    });

    it("rechaza un proveedor que no existe, sin subir archivos", async () => {
      facturas.manager.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(crearDto({ proveedorId: 99 }), [archivo()]),
      ).rejects.toThrow(/proveedor no existe/);
      expect(files.uploadAll).not.toHaveBeenCalled();
    });

    it("rechaza un proveedor desactivado", async () => {
      facturas.manager.findOneBy.mockResolvedValue({ id: 1, activo: false });

      await expect(service.create(crearDto())).rejects.toThrow(/desactivado/);
      expect(facturas.save).not.toHaveBeenCalled();
    });

    it("sube los soportes y los guarda como filas hijas", async () => {
      const archivos = [archivo(), archivo()];

      await service.create(crearDto(), archivos);

      expect(files.validarLote).toHaveBeenCalledWith(archivos, 0);
      const guardada = facturas.save.mock.calls[0][0];
      expect(
        guardada.imagenes.map((i: { publicId: string }) => i.publicId),
      ).toEqual(["docs/img1", "docs/img2"]);
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });

    it("devuelve el detalle releído de la base", async () => {
      facturas.findOne.mockResolvedValue(
        crearFactura({ id: 1, numero: "F-9" }),
      );

      const res = await service.create(crearDto({ numero: "F-9" }));

      expect(res).toMatchObject({ id: 1, numero: "F-9", abonos: [] });
    });

    it("borra de Cloudinary lo recién subido si la base falla", async () => {
      facturas.save.mockRejectedValueOnce(new Error("caída"));

      await expect(
        service.create(crearDto(), [archivo(), archivo()]),
      ).rejects.toThrow("caída");
      expect(files.deleteFiles).toHaveBeenCalledWith([
        "docs/img1",
        "docs/img2",
      ]);
    });

    it("responde 409 por número repetido cuando falla UQ_facturas_numero", async () => {
      facturas.save.mockRejectedValueOnce({
        code: "23505",
        constraint: "UQ_facturas_numero",
      });

      const intento = service.create(crearDto(), [archivo()]);

      await expect(intento).rejects.toBeInstanceOf(ConflictException);
      await expect(intento).rejects.toThrow(
        "Ya existe una factura con ese número.",
      );
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img1"]);
    });

    it("responde 409 por soporte repetido cuando falla otra constraint única", async () => {
      facturas.save.mockRejectedValueOnce({
        code: "23505",
        constraint: "UQ_factura_imagenes_public_id",
      });

      const intento = service.create(crearDto(), [archivo()]);

      await expect(intento).rejects.toBeInstanceOf(ConflictException);
      await expect(intento).rejects.toThrow(/soportes/);
    });

    it("no traduce los errores que no son de unicidad", async () => {
      const error = { code: "23502" };
      facturas.save.mockRejectedValueOnce(error);

      await expect(service.create(crearDto())).rejects.toBe(error);
    });

    it("guarda las cuotas calculadas con interés en la modalidad cuotas", async () => {
      const dto = dtoCuotas({
        interesPorcentaje: 10,
        primeraCuota: "2026-12-15",
      });

      await service.create(dto);

      const guardada = facturas.save.mock.calls[0][0];
      expect(guardada).toMatchObject({
        modalidad: "cuotas",
        total: 100000,
        interesPorcentaje: 10,
        interesMonto: 10000,
        periodicidad: "mensual",
        vence: null,
      });
      // 110000 en 4 cuotas; la lista cruza el cambio de año.
      expect(guardada.cuotas).toEqual([
        { numero: 1, vence: "2026-12-15", monto: 27500 },
        { numero: 2, vence: "2027-01-15", monto: 27500 },
        { numero: 3, vence: "2027-02-15", monto: 27500 },
        { numero: 4, vence: "2027-03-15", monto: 27500 },
      ]);
    });

    it("guarda vence y ninguna cuota en la modalidad plazo", async () => {
      await service.create(
        crearDto({ modalidad: "plazo", vence: "2026-12-20" }),
      );

      expect(facturas.save.mock.calls[0][0]).toMatchObject({
        modalidad: "plazo",
        vence: "2026-12-20",
        cuotas: [],
        interesMonto: 0,
      });
    });

    it("ignora vence y los campos de cuotas en la modalidad libre", async () => {
      await service.create(
        crearDto({
          vence: "2026-12-20",
          numeroCuotas: 3,
          periodicidad: "semanal",
          interesPorcentaje: 50,
        }),
      );

      expect(facturas.save.mock.calls[0][0]).toMatchObject({
        modalidad: "libre",
        vence: null,
        periodicidad: null,
        interesPorcentaje: 0,
        interesMonto: 0,
        cuotas: [],
      });
    });
  });

  describe("findAll", () => {
    const listado = () => [
      crearFactura({ id: 1, numero: "A", total: 100000 }),
      crearFactura({ id: 2, numero: "B", total: 50000 }),
      crearFactura({
        id: 3,
        numero: "C",
        total: 80000,
        modalidad: "plazo",
        vence: "2026-11-01",
      }),
    ];

    it("calcula total a pagar, pagado, saldo y estado de cada factura", async () => {
      consultaFacturas.getMany.mockResolvedValue(listado());
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 2, pagado: "50000" },
        { facturaId: "3", pagado: "10000" },
      ]);

      const res = await service.findAll();

      expect(res.map((f) => [f.numero, f.pagado, f.saldo, f.estado])).toEqual([
        ["A", 0, 100000, "pendiente"],
        ["B", 50000, 0, "pagada"],
        ["C", 10000, 70000, "vencida"],
      ]);
      expect(res[0].totalAPagar).toBe(100000);
    });

    it("suma el interés al total a pagar y al saldo", async () => {
      consultaFacturas.getMany.mockResolvedValue([
        crearFactura({ id: 1, total: 100000, interesMonto: 10000 }),
      ]);
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 1, pagado: "30000" },
      ]);

      const [f] = await service.findAll();

      expect(f).toMatchObject({
        totalAPagar: 110000,
        pagado: 30000,
        saldo: 80000,
        estado: "parcial",
      });
    });

    it("filtra por estado", async () => {
      consultaFacturas.getMany.mockResolvedValue(listado());
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 2, pagado: "50000" },
      ]);

      const res = await service.findAll({ estado: "pagada" });

      expect(res.map((f) => f.numero)).toEqual(["B"]);
    });

    it("consulta lo pagado de todas las facturas en una sola consulta", async () => {
      consultaFacturas.getMany.mockResolvedValue(listado());

      await service.findAll();

      expect(salidas.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(consultaPagados.where).toHaveBeenCalledWith(
        "s.facturaId IN (:...ids)",
        { ids: [1, 2, 3] },
      );
    });

    it("no consulta pagados si no hay facturas", async () => {
      const res = await service.findAll();

      expect(res).toEqual([]);
      expect(salidas.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("filtra por proveedor escapando los comodines de LIKE", async () => {
      await service.findAll({ proveedor: "100%_a" });

      expect(consultaFacturas.andWhere).toHaveBeenCalledWith(
        "p.nombre ILIKE :proveedor",
        { proveedor: "%100\\%\\_a%" },
      );
    });

    it("filtra por el id del proveedor", async () => {
      await service.findAll({ proveedorId: 7 });

      expect(consultaFacturas.andWhere).toHaveBeenCalledWith(
        "f.proveedorId = :proveedorId",
        { proveedorId: 7 },
      );
    });

    it("filtra por el rango del mes, diciembre hasta el 1 de enero siguiente", async () => {
      await service.findAll({ mes: "2026-12" });

      expect(consultaFacturas.andWhere).toHaveBeenCalledWith(
        "f.fecha >= :desde AND f.fecha < :hasta",
        { desde: "2026-12-01", hasta: "2027-01-01" },
      );
    });
  });

  describe("resumen", () => {
    it("devuelve todo en cero si no hay facturas", async () => {
      const res = await service.resumen();

      expect(res).toEqual({
        facturado: 0,
        pagado: 0,
        porPagar: 0,
        vencido: 0,
        porVencer7Dias: 0,
        facturasConSaldo: 0,
        masDeuda: [],
      });
    });

    it("calcula facturado, pagado, por pagar, vencido y por vencer en 7 días", async () => {
      consultaFacturas.getMany.mockResolvedValue([
        crearFactura({
          id: 1,
          numero: "F1",
          total: 100000,
          modalidad: "plazo",
          vence: "2026-11-20",
        }),
        crearFactura({
          id: 2,
          numero: "F2",
          total: 50000,
          modalidad: "plazo",
          vence: "2026-12-01",
        }),
        crearFactura({ id: 3, numero: "F3", total: 200000 }),
        crearFactura({ id: 4, numero: "F4", total: 10000 }),
      ]);
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 1, pagado: "30000" },
        { facturaId: 4, pagado: "10000" },
      ]);

      const res = await service.resumen();

      expect(res).toMatchObject({
        facturado: 360000,
        pagado: 40000,
        porPagar: 320000,
        vencido: 70000,
        porVencer7Dias: 50000,
        facturasConSaldo: 3,
      });
    });

    it("ordena masDeuda de mayor a menor saldo y excluye las pagadas", async () => {
      consultaFacturas.getMany.mockResolvedValue([
        crearFactura({ id: 1, numero: "F1", total: 70000 }),
        crearFactura({ id: 2, numero: "F2", total: 200000 }),
        crearFactura({ id: 3, numero: "F3", total: 10000 }),
        crearFactura({ id: 4, numero: "F4", total: 50000 }),
      ]);
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 3, pagado: "10000" },
      ]);

      const res = await service.resumen();

      expect(res.masDeuda.map((f) => [f.numero, f.saldo])).toEqual([
        ["F2", 200000],
        ["F1", 70000],
        ["F4", 50000],
      ]);
    });

    it("limita masDeuda a las 5 facturas con más deuda", async () => {
      consultaFacturas.getMany.mockResolvedValue(
        [1, 2, 3, 4, 5, 6, 7].map((n) =>
          crearFactura({ id: n, numero: `F${n}`, total: n * 1000 }),
        ),
      );

      const res = await service.resumen();

      expect(res.masDeuda).toHaveLength(5);
      expect(res.masDeuda[0].numero).toBe("F7");
      expect(res.facturasConSaldo).toBe(7);
    });

    it("cuenta como por vencer, y no vencido, lo que vence hoy o dentro de 7 días", async () => {
      consultaFacturas.getMany.mockResolvedValue([
        crearFactura({
          id: 1,
          total: 10000,
          modalidad: "plazo",
          vence: "2026-11-25",
        }),
        crearFactura({
          id: 2,
          total: 20000,
          modalidad: "plazo",
          vence: "2026-12-02",
        }),
        crearFactura({
          id: 3,
          total: 40000,
          modalidad: "plazo",
          vence: "2026-12-03",
        }),
      ]);

      const res = await service.resumen();

      expect(res.vencido).toBe(0);
      expect(res.porVencer7Dias).toBe(30000);
    });

    it("usa el día de negocio de Colombia, no el UTC, para decidir lo vencido", async () => {
      // 02:00 UTC del 26 es todavía el 25 en Colombia.
      jest.setSystemTime(new Date("2026-11-26T02:00:00Z"));
      consultaFacturas.getMany.mockResolvedValue([
        crearFactura({
          id: 1,
          total: 10000,
          modalidad: "plazo",
          vence: "2026-11-25",
        }),
      ]);

      const res = await service.resumen();

      expect(res.vencido).toBe(0);
      expect(res.porVencer7Dias).toBe(10000);
    });

    it("reparte lo pagado entre las cuotas en orden y marca la cuota vencida", async () => {
      consultaFacturas.getMany.mockResolvedValue([
        crearFactura({
          id: 1,
          total: 100000,
          modalidad: "cuotas",
          cuotas: [
            { numero: 1, vence: "2026-11-10", monto: 50000 },
            { numero: 2, vence: "2026-11-20", monto: 50000 },
          ],
        }),
      ]);
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 1, pagado: "60000" },
      ]);

      const res = await service.resumen();

      expect(res.vencido).toBe(40000);
      expect(res.porVencer7Dias).toBe(0);
    });
  });

  describe("simular", () => {
    it("calcula el calendario con interés sin guardar nada", () => {
      const plan = service.simular({
        total: 100000,
        interesPorcentaje: 10,
        numeroCuotas: 4,
        periodicidad: "mensual",
        primeraCuota: "2026-12-15",
      });

      expect(plan.interesMonto).toBe(10000);
      expect(plan.totalAPagar).toBe(110000);
      expect(plan.cuotas.map((c) => c.vence)).toEqual([
        "2026-12-15",
        "2027-01-15",
        "2027-02-15",
        "2027-03-15",
      ]);
      expect(facturas.save).not.toHaveBeenCalled();
    });

    it("sin interés la última cuota absorbe el redondeo", () => {
      const plan = service.simular({
        total: 100,
        numeroCuotas: 3,
        periodicidad: "semanal",
        primeraCuota: "2026-11-01",
      });

      expect(plan.interesMonto).toBe(0);
      expect(plan.cuotas.map((c) => c.monto)).toEqual([33, 33, 34]);
      expect(plan.cuotas.map((c) => c.vence)).toEqual([
        "2026-11-01",
        "2026-11-08",
        "2026-11-15",
      ]);
    });
  });

  describe("findOne", () => {
    it("lanza 404 si la factura no existe", async () => {
      facturas.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("trae los abonos de la factura con sus soportes", async () => {
      const abonos = [
        { id: 3, total: 20000 },
        { id: 2, total: 10000 },
      ];
      salidas.find.mockResolvedValue(abonos);
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 1, pagado: "30000" },
      ]);

      const res = await service.findOne(1);

      expect(res.abonos).toBe(abonos);
      expect(res).toMatchObject({ pagado: 30000, saldo: 70000 });
      expect(salidas.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { facturaId: 1 },
          relations: { imagenes: true },
        }),
      );
    });

    it("devuelve el calendario con el estado de cada cuota en la modalidad cuotas", async () => {
      facturas.findOne.mockResolvedValue(
        crearFactura({
          modalidad: "cuotas",
          cuotas: [
            { numero: 1, vence: "2026-11-10", monto: 50000 },
            { numero: 2, vence: "2026-12-10", monto: 50000 },
          ],
        }),
      );
      consultaPagados.getRawMany.mockResolvedValue([
        { facturaId: 1, pagado: "60000" },
      ]);

      const res = await service.findOne(1);

      expect(res.cuotas.map((c) => [c.pagado, c.pendiente, c.estado])).toEqual([
        [50000, 0, "pagada"],
        [10000, 40000, "parcial"],
      ]);
    });

    it("devuelve cuotas vacías si la modalidad no es cuotas", async () => {
      const res = await service.findOne(1);

      expect(res.cuotas).toEqual([]);
      expect(res.pagado).toBe(0);
    });
  });

  describe("update", () => {
    const existente = (datos: Record<string, unknown> = {}) =>
      crearFactura({
        id: 5,
        imagenes: [
          { id: 10, ...imagen(1) },
          { id: 11, ...imagen(2) },
        ],
        ...datos,
      });

    const conPagos = (pagado: number, pagos = 1) =>
      consultaTx.getRawOne.mockResolvedValue({
        pagado: String(pagado),
        pagos: String(pagos),
      });

    beforeEach(() => {
      facturas.findOne.mockResolvedValue(existente());
    });

    it("lanza 404 si la factura no existe", async () => {
      facturas.findOne.mockResolvedValue(null);

      await expect(service.update(99, crearDto())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(facturas.manager.transaction).not.toHaveBeenCalled();
    });

    it("responde 400 si conservar incluye un soporte ajeno", async () => {
      await expect(
        service.update(5, crearDto({ conservar: ["docs/otro"] })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(files.uploadAll).not.toHaveBeenCalled();
    });

    it("conserva los indicados, suma los nuevos y borra los quitados", async () => {
      files.uploadAll.mockResolvedValueOnce([imagen(3)]);

      await service.update(5, crearDto({ conservar: ["docs/img2"] }), [
        archivo(),
      ]);

      expect(files.validarLote).toHaveBeenCalledWith([expect.anything()], 1);
      const guardada = manager.save.mock.calls[0][0];
      expect(
        guardada.imagenes.map((i: { publicId: string }) => i.publicId),
      ).toEqual(["docs/img2", "docs/img3"]);
      expect(guardada.imagenes[0]).toMatchObject({ id: 11 });
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img1"]);
    });

    it("bloquea la fila de la factura dentro de la transacción", async () => {
      await service.update(5, crearDto());

      expect(manager.findOne).toHaveBeenCalledWith(Factura, {
        where: { id: 5 },
        lock: { mode: "pessimistic_write" },
        loadEagerRelations: false,
      });
    });

    it("admite el proveedor actual aunque esté desactivado", async () => {
      facturas.manager.findOneBy.mockResolvedValue({ id: 1, activo: false });

      await service.update(5, crearDto({ proveedorId: 1 }));

      expect(manager.save).toHaveBeenCalled();
    });

    it("no admite cambiar a un proveedor desactivado", async () => {
      facturas.manager.findOneBy.mockResolvedValue({ id: 2, activo: false });

      await expect(
        service.update(5, crearDto({ proveedorId: 2 })),
      ).rejects.toThrow(/desactivado/);
      expect(files.uploadAll).not.toHaveBeenCalled();
    });

    it("si la base falla borra solo lo recién subido, no lo anterior", async () => {
      files.uploadAll.mockResolvedValueOnce([imagen(3)]);
      manager.save.mockRejectedValueOnce(new Error("caída"));

      await expect(
        service.update(5, crearDto({ conservar: ["docs/img1"] }), [archivo()]),
      ).rejects.toThrow("caída");
      expect(files.deleteFiles).toHaveBeenCalledTimes(1);
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img3"]);
    });

    it("responde 409 si el nuevo número ya existe", async () => {
      manager.save.mockRejectedValueOnce({
        code: "23505",
        constraint: "UQ_facturas_numero",
      });

      await expect(
        service.update(5, crearDto({ numero: "F-2" })),
      ).rejects.toThrow("Ya existe una factura con ese número.");
    });

    it("no permite cambiar la modalidad cuando hay pagos", async () => {
      conPagos(1000);

      const intento = service.update(
        5,
        crearDto({ modalidad: "plazo", vence: "2026-12-20" }),
        [archivo()],
      );

      await expect(intento).rejects.toBeInstanceOf(BadRequestException);
      await expect(intento).rejects.toThrow(/modalidad/);
      expect(manager.save).not.toHaveBeenCalled();
      expect(files.deleteFiles).toHaveBeenCalledWith(["docs/img1"]);
    });

    it("permite cambiar la modalidad cuando no hay pagos", async () => {
      await service.update(
        5,
        crearDto({ modalidad: "plazo", vence: "2026-12-20" }),
      );

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ modalidad: "plazo", vence: "2026-12-20" }),
      );
    });

    describe("con pagos y modalidad cuotas", () => {
      beforeEach(() => {
        facturas.findOne.mockResolvedValue(
          existente({ modalidad: "cuotas", periodicidad: "mensual" }),
        );
        facturas.manager.find.mockResolvedValue(cuotasGuardadas());
        conPagos(30000);
      });

      it("no permite cambiar el total", async () => {
        const intento = service.update(5, dtoCuotas({ total: 120000 }));

        await expect(intento).rejects.toBeInstanceOf(BadRequestException);
        await expect(intento).rejects.toThrow(/total ni las cuotas/);
        expect(manager.save).not.toHaveBeenCalled();
      });

      it("no permite cambiar el calendario aunque el total sea el mismo", async () => {
        await expect(
          service.update(5, dtoCuotas({ primeraCuota: "2026-12-15" })),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          service.update(5, dtoCuotas({ numeroCuotas: 5 })),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it("permite editar otros datos si total y calendario no cambian, sin tocar las cuotas", async () => {
        await service.update(5, dtoCuotas({ proveedorId: 2 }));

        expect(manager.save).toHaveBeenCalledWith(
          expect.objectContaining({ proveedorId: 2 }),
        );
        expect(consultaTx.delete).not.toHaveBeenCalled();
      });
    });

    describe("con pagos y sin cuotas", () => {
      it("no permite que el total quede por debajo de lo pagado", async () => {
        conPagos(60000);

        const intento = service.update(5, crearDto({ total: 50000 }));

        await expect(intento).rejects.toBeInstanceOf(BadRequestException);
        await expect(intento).rejects.toThrow(/menor que lo ya pagado/);
        expect(manager.save).not.toHaveBeenCalled();
      });

      it("permite que el total quede igual a lo pagado", async () => {
        conPagos(60000);

        await service.update(5, crearDto({ total: 60000 }));

        expect(manager.save).toHaveBeenCalledWith(
          expect.objectContaining({ total: 60000 }),
        );
      });
    });

    describe("sin pagos", () => {
      it("regenera las cuotas: borra las anteriores y guarda las nuevas", async () => {
        facturas.findOne.mockResolvedValue(
          existente({ modalidad: "cuotas", periodicidad: "mensual" }),
        );

        await service.update(
          5,
          dtoCuotas({
            total: 90000,
            numeroCuotas: 3,
            primeraCuota: "2026-12-01",
          }),
        );

        expect(consultaTx.delete).toHaveBeenCalled();
        expect(consultaTx.from).toHaveBeenCalledWith(FacturaCuota);
        expect(consultaTx.where).toHaveBeenCalledWith("factura_id = :id", {
          id: 5,
        });
        expect(consultaTx.execute).toHaveBeenCalled();
        const guardada = manager.save.mock.calls[0][0];
        expect(guardada.total).toBe(90000);
        expect(guardada.cuotas).toHaveLength(3);
        expect(guardada.cuotas[0]).toBeInstanceOf(FacturaCuota);
        expect(guardada.cuotas.map((c: FacturaCuota) => c.monto)).toEqual([
          30000, 30000, 30000,
        ]);
      });

      it("devuelve el detalle releído tras guardar", async () => {
        const res = await service.update(5, crearDto());

        expect(res).toMatchObject({ id: 5 });
      });
    });
  });

  describe("remove", () => {
    beforeEach(() => {
      facturas.findOne.mockResolvedValue(
        crearFactura({ id: 5, imagenes: [imagen(1), imagen(2)] }),
      );
    });

    it("lanza 404 si la factura no existe", async () => {
      facturas.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(facturas.remove).not.toHaveBeenCalled();
    });

    it("responde 409 si la factura tiene pagos", async () => {
      salidas.count.mockResolvedValue(2);

      await expect(service.remove(5)).rejects.toBeInstanceOf(ConflictException);
      expect(salidas.count).toHaveBeenCalledWith({ where: { facturaId: 5 } });
      expect(facturas.remove).not.toHaveBeenCalled();
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });

    it("responde 409 si la FK salta al borrar porque entró un pago", async () => {
      facturas.remove.mockRejectedValueOnce({ code: "23503" });

      await expect(service.remove(5)).rejects.toBeInstanceOf(ConflictException);
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });

    it("borra la factura y sus soportes de Cloudinary", async () => {
      await service.remove(5);

      expect(facturas.remove).toHaveBeenCalled();
      expect(files.deleteFiles).toHaveBeenCalledWith([
        "docs/img1",
        "docs/img2",
      ]);
    });

    it("no toca Cloudinary si la base falla con otro error", async () => {
      facturas.remove.mockRejectedValueOnce(new Error("caída"));

      await expect(service.remove(5)).rejects.toThrow("caída");
      expect(files.deleteFiles).not.toHaveBeenCalled();
    });
  });
});
