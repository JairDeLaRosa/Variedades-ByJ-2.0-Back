import { BadRequestException } from "@nestjs/common";
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
  const ventas = { createQueryBuilder: jest.fn(() => consultaVentas) };
  const salidas = { createQueryBuilder: jest.fn(() => consultaSalidas) };

  let service: ReportesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportesService(ventas as never, salidas as never);
  });

  it("arma el resumen con totales, balance, serie y rankings", async () => {
    consultaVentas.getRawOne.mockResolvedValue({
      total: "160000",
      papeleria: "50000",
      pinateria: "95000",
      transferencias: "15000",
      dias: "2",
    });
    consultaVentas.getRawMany
      .mockResolvedValueOnce([{ periodo: "2026-11-19", total: "100000" }])
      .mockResolvedValueOnce([{ fecha: "2026-11-19", total: 100000 }]);
    consultaSalidas.getRawOne.mockResolvedValue({
      total: "500000",
      cantidad: "1",
    });
    consultaSalidas.getRawMany
      .mockResolvedValueOnce([{ periodo: "2026-11-19", total: "500000" }])
      .mockResolvedValueOnce([
        { tienda: "VENEPLAS", total: "500000", cantidad: "1" },
      ]);

    const res = await service.resumen({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });

    expect(res.granularidad).toBe("dia");
    expect(res.ventas).toEqual({
      total: 160000,
      papeleria: 50000,
      pinateria: 95000,
      transferencias: 15000,
      dias: 2,
    });
    expect(res.salidas).toEqual({ total: 500000, cantidad: 1 });
    expect(res.balance).toBe(-340000);
    expect(res.serie).toEqual([
      { periodo: "2026-11-19", ventas: 100000, salidas: 500000 },
    ]);
    expect(res.tiendas).toEqual([
      { tienda: "VENEPLAS", total: 500000, cantidad: 1 },
    ]);
    expect(res.mejoresDias).toEqual([{ fecha: "2026-11-19", total: 100000 }]);
  });

  it("agrupa por mes cuando el rango pasa de 62 días", async () => {
    consultaVentas.getRawOne.mockResolvedValue(undefined);
    consultaSalidas.getRawOne.mockResolvedValue(undefined);
    consultaVentas.getRawMany.mockResolvedValue([]);
    consultaSalidas.getRawMany.mockResolvedValue([]);

    const res = await service.resumen({
      desde: "2026-01-01",
      hasta: "2026-12-31",
    });

    expect(res.granularidad).toBe("mes");
    expect(res.ventas.total).toBe(0);
    expect(res.balance).toBe(0);
    expect(consultaVentas.select).toHaveBeenCalledWith(
      "to_char(v.fecha, 'YYYY-MM')",
      "periodo",
    );
  });

  it("no consulta la base de datos si el rango es inválido", async () => {
    await expect(
      service.resumen({ desde: "2026-11-30", hasta: "2026-11-01" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(ventas.createQueryBuilder).not.toHaveBeenCalled();
  });
});
