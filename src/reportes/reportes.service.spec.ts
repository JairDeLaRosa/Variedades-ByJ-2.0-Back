import { BadRequestException } from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { Permiso, TODOS_LOS_PERMISOS } from "../auth/permisos";
import { diasDelRango, ReportesService, unirSeries } from "./reportes.service";

describe("diasDelRango", () => {
  it("cuenta ambos extremos del rango", () => {
    expect(diasDelRango("2026-11-01", "2026-11-01")).toBe(1);
    expect(diasDelRango("2026-11-01", "2026-11-30")).toBe(30);
    expect(diasDelRango("2026-01-01", "2026-12-31")).toBe(365);
  });

  it("rechaza un rango invertido", () => {
    expect(() => diasDelRango("2026-11-10", "2026-11-01")).toThrow(
      BadRequestException,
    );
  });

  it("rechaza fechas que el calendario no tiene", () => {
    expect(() => diasDelRango("2026-02-31", "2026-03-01")).toThrow(/no existe/);
  });

  it("rechaza rangos de más de 1100 días", () => {
    expect(() => diasDelRango("2020-01-01", "2026-01-01")).toThrow(
      /no puede superar/,
    );
  });
});

describe("unirSeries", () => {
  it("une ventas y salidas por periodo y ordena de antiguo a reciente", () => {
    const serie = unirSeries(
      [
        { periodo: "2026-11-19", total: "100000" },
        { periodo: "2026-11-18", total: "60000" },
      ],
      [{ periodo: "2026-11-19", total: "500000" }],
    );

    expect(serie).toEqual([
      { periodo: "2026-11-18", ventas: 60000, salidas: 0 },
      { periodo: "2026-11-19", ventas: 100000, salidas: 500000 },
    ]);
  });

  it("incluye periodos que solo tienen salidas", () => {
    const serie = unirSeries([], [{ periodo: "2026-10", total: 7 }]);

    expect(serie).toEqual([{ periodo: "2026-10", ventas: 0, salidas: 7 }]);
  });
});

describe("ReportesService.resumen", () => {
  // Cada repositorio devuelve su cadena de QueryBuilder; las consultas se piden
  // en el mismo orden en que las encadena el servicio.
  const cadena = () => ({
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  });
  const consultaVentas = cadena();
  const consultaSalidas = cadena();
  const consultaFacturas = cadena();
  const ventas = { createQueryBuilder: jest.fn(() => consultaVentas) };
  const salidas = { createQueryBuilder: jest.fn(() => consultaSalidas) };
  const facturas = {
    createQueryBuilder: jest.fn(() => consultaFacturas),
    query: jest.fn(),
  };
  const facturaService = { resumen: jest.fn() };

  const RANGO = { desde: "2026-11-01", hasta: "2026-11-30" };
  const actor = (permisos: Permiso[]): AuthUser => ({
    uid: 1,
    name: "Ana",
    rolId: 1,
    rolNombre: "Vendedor",
    esAdmin: false,
    permisos,
  });
  const sinPermisos = actor([]);
  const conFacturas = actor([Permiso.FacturasVer]);

  let service: ReportesService;

  beforeEach(() => {
    jest.resetAllMocks();
    ventas.createQueryBuilder.mockReturnValue(consultaVentas);
    salidas.createQueryBuilder.mockReturnValue(consultaSalidas);
    facturas.createQueryBuilder.mockReturnValue(consultaFacturas);
    for (const c of [consultaVentas, consultaSalidas, consultaFacturas]) {
      c.leftJoin.mockReturnThis();
      c.select.mockReturnThis();
      c.addSelect.mockReturnThis();
      c.where.mockReturnThis();
      c.groupBy.mockReturnThis();
      c.orderBy.mockReturnThis();
      c.addOrderBy.mockReturnThis();
      c.limit.mockReturnThis();
    }
    // Por defecto todas las consultas vienen vacías.
    consultaVentas.getRawOne.mockResolvedValue(undefined);
    consultaSalidas.getRawOne.mockResolvedValue(undefined);
    consultaFacturas.getRawOne.mockResolvedValue(undefined);
    consultaVentas.getRawMany.mockResolvedValue([]);
    consultaSalidas.getRawMany.mockResolvedValue([]);
    facturas.query.mockResolvedValue([]);
    facturaService.resumen.mockResolvedValue({
      porPagar: 0,
      vencido: 0,
      porVencer7Dias: 0,
      facturasConSaldo: 0,
    });
    service = new ReportesService(
      ventas as never,
      salidas as never,
      facturas as never,
      facturaService as never,
    );
  });

  it("arma el resumen con totales, balance, serie y rankings", async () => {
    consultaVentas.getRawOne.mockResolvedValue({
      total: "145000",
      papeleria: "50000",
      pinateria: "95000",
      dias: "2",
    });
    consultaVentas.getRawMany
      .mockResolvedValueOnce([{ periodo: "2026-11-19", total: "100000" }])
      .mockResolvedValueOnce([{ fecha: "2026-11-19", total: 100000 }]);
    consultaSalidas.getRawOne.mockResolvedValue({
      total: "500000",
      cantidad: "1",
      aFacturas: "500000",
    });
    consultaSalidas.getRawMany
      .mockResolvedValueOnce([{ periodo: "2026-11-19", total: "500000" }])
      .mockResolvedValueOnce([
        { tienda: "VENEPLAS", total: "500000", cantidad: "1" },
      ]);

    const res = await service.resumen(RANGO, sinPermisos);

    expect(res.granularidad).toBe("dia");
    expect(res.ventas).toEqual({
      total: 145000,
      papeleria: 50000,
      pinateria: 95000,
      dias: 2,
    });
    expect(res.salidas).toEqual({
      total: 500000,
      cantidad: 1,
      aFacturas: 500000,
      libres: 0,
    });
    expect(res.balance).toBe(-355000);
    expect(res.serie).toEqual([
      { periodo: "2026-11-19", ventas: 100000, salidas: 500000 },
    ]);
    expect(res.tiendas).toEqual([
      { tienda: "VENEPLAS", total: 500000, cantidad: 1 },
    ]);
    expect(res.mejoresDias).toEqual([{ fecha: "2026-11-19", total: 100000 }]);
  });

  it("agrupa por mes cuando el rango pasa de 62 días", async () => {
    const res = await service.resumen(
      { desde: "2026-01-01", hasta: "2026-12-31" },
      sinPermisos,
    );

    expect(res.granularidad).toBe("mes");
    expect(res.ventas.total).toBe(0);
    expect(res.balance).toBe(0);
    expect(res.salidas).toEqual({
      total: 0,
      cantidad: 0,
      aFacturas: 0,
      libres: 0,
    });
    expect(res.facturas).toEqual({ cantidad: 0, facturado: 0 });
    expect(consultaVentas.select).toHaveBeenCalledWith(
      "to_char(v.fecha, 'YYYY-MM')",
      "periodo",
    );
  });

  it("no consulta la base de datos si el rango es inválido", async () => {
    await expect(
      service.resumen(
        { desde: "2026-11-30", hasta: "2026-11-01" },
        conFacturas,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(ventas.createQueryBuilder).not.toHaveBeenCalled();
    expect(facturas.createQueryBuilder).not.toHaveBeenCalled();
    expect(facturaService.resumen).not.toHaveBeenCalled();
  });

  it("reparte los pagos entre facturas y libres", async () => {
    consultaSalidas.getRawOne.mockResolvedValue({
      total: "800000",
      cantidad: "4",
      aFacturas: "500000",
    });

    const res = await service.resumen(RANGO, sinPermisos);

    expect(res.salidas).toEqual({
      total: 800000,
      cantidad: 4,
      aFacturas: 500000,
      libres: 300000,
    });
  });

  it("deja los pagos libres en el total cuando ninguno va a una factura", async () => {
    consultaSalidas.getRawOne.mockResolvedValue({
      total: "120000",
      cantidad: "2",
      aFacturas: "0",
    });

    const res = await service.resumen(RANGO, sinPermisos);

    expect(res.salidas.aFacturas).toBe(0);
    expect(res.salidas.libres).toBe(120000);
  });

  it("informa las facturas del periodo con su cantidad y lo facturado", async () => {
    consultaFacturas.getRawOne.mockResolvedValue({
      cantidad: "3",
      facturado: "1250000",
    });

    const res = await service.resumen(RANGO, sinPermisos);

    expect(res.facturas).toEqual({ cantidad: 3, facturado: 1250000 });
    expect(facturas.createQueryBuilder).toHaveBeenCalledWith("f");
    expect(consultaFacturas.where).toHaveBeenCalledWith(
      "f.fecha BETWEEN :desde AND :hasta",
      RANGO,
    );
  });

  describe("deuda", () => {
    const RESUMEN_FACTURAS = {
      porPagar: 900000,
      vencido: 400000,
      porVencer7Dias: 150000,
      facturasConSaldo: 4,
    };

    it("incluye la deuda con proveedores en número si puede ver facturas", async () => {
      facturaService.resumen.mockResolvedValue(RESUMEN_FACTURAS);
      facturas.query.mockResolvedValue([
        { proveedor: "VENEPLAS", saldo: "600000", facturas: "3" },
        { proveedor: "PAPELES SA", saldo: "300000", facturas: "1" },
      ]);

      const res = await service.resumen(RANGO, conFacturas);

      expect(res.deuda).toEqual({
        ...RESUMEN_FACTURAS,
        proveedores: [
          { proveedor: "VENEPLAS", saldo: 600000, facturas: 3 },
          { proveedor: "PAPELES SA", saldo: 300000, facturas: 1 },
        ],
      });
      expect(facturaService.resumen).toHaveBeenCalledTimes(1);
      expect(facturas.query).toHaveBeenCalledWith(expect.any(String), [5]);
    });

    it("devuelve la deuda sin proveedores cuando no hay saldos pendientes", async () => {
      const res = await service.resumen(RANGO, conFacturas);

      expect(res.deuda).toEqual({
        porPagar: 0,
        vencido: 0,
        porVencer7Dias: 0,
        facturasConSaldo: 0,
        proveedores: [],
      });
    });

    it("deja la deuda en null y no la consulta sin permiso de ver facturas", async () => {
      const res = await service.resumen(
        RANGO,
        actor([Permiso.VentasVer, Permiso.SalidasVer]),
      );

      expect(res.deuda).toBeNull();
      expect(facturaService.resumen).not.toHaveBeenCalled();
      expect(facturas.query).not.toHaveBeenCalled();
    });

    it("entrega la deuda al administrador, que tiene todos los permisos", async () => {
      facturaService.resumen.mockResolvedValue(RESUMEN_FACTURAS);
      facturas.query.mockResolvedValue([
        { proveedor: "VENEPLAS", saldo: "900000", facturas: "4" },
      ]);

      const res = await service.resumen(RANGO, {
        ...actor(TODOS_LOS_PERMISOS),
        rolNombre: "Administrador",
        esAdmin: true,
      });

      expect(res.deuda?.porPagar).toBe(900000);
      expect(res.deuda?.proveedores).toEqual([
        { proveedor: "VENEPLAS", saldo: 900000, facturas: 4 },
      ]);
    });

    it("sigue calculando ventas y salidas aunque no vea la deuda", async () => {
      consultaVentas.getRawOne.mockResolvedValue({ total: "100000" });
      consultaSalidas.getRawOne.mockResolvedValue({
        total: "40000",
        cantidad: "1",
        aFacturas: "0",
      });

      const res = await service.resumen(RANGO, sinPermisos);

      expect(res.deuda).toBeNull();
      expect(res.balance).toBe(60000);
    });
  });
});
