import {
  calcularCuotas,
  estadoDeFactura,
  hoyNegocio,
  obligacionesDe,
  repartirPagos,
  sumarDias,
  sumarMeses,
} from "./calculos";

describe("sumarMeses", () => {
  it("suma meses y cruza el cambio de año", () => {
    expect(sumarMeses("2026-11-15", 1)).toBe("2026-12-15");
    expect(sumarMeses("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("no desborda: el 31 de enero más un mes es fin de febrero", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2028-01-31", 1)).toBe("2028-02-29");
    expect(sumarMeses("2026-01-31", 2)).toBe("2026-03-31");
  });
});

describe("sumarDias", () => {
  it("cruza el fin de mes", () => {
    expect(sumarDias("2026-11-28", 7)).toBe("2026-12-05");
  });
});

describe("hoyNegocio", () => {
  it("usa la hora de Colombia, no la UTC", () => {
    // 02:00 UTC del 26 es todavía el 25 a las 21:00 en Bogotá.
    expect(hoyNegocio(new Date("2026-11-26T02:00:00Z"))).toBe("2026-11-25");
    expect(hoyNegocio(new Date("2026-11-26T06:00:00Z"))).toBe("2026-11-26");
  });
});

describe("calcularCuotas", () => {
  const base = {
    total: 1_000_000,
    interesPorcentaje: 0,
    numeroCuotas: 4,
    periodicidad: "mensual" as const,
    primeraCuota: "2026-12-10",
  };

  it("sin interés, las cuotas suman exactamente el total", () => {
    const plan = calcularCuotas(base);

    expect(plan.interesMonto).toBe(0);
    expect(plan.totalAPagar).toBe(1_000_000);
    expect(plan.cuotas.map((c) => c.monto)).toEqual([
      250_000, 250_000, 250_000, 250_000,
    ]);
    expect(plan.cuotas.map((c) => c.vence)).toEqual([
      "2026-12-10",
      "2027-01-10",
      "2027-02-10",
      "2027-03-10",
    ]);
  });

  it("aplica interés simple sobre el total", () => {
    const plan = calcularCuotas({ ...base, interesPorcentaje: 10 });

    expect(plan.interesMonto).toBe(100_000);
    expect(plan.totalAPagar).toBe(1_100_000);
    expect(plan.cuotas.reduce((s, c) => s + c.monto, 0)).toBe(1_100_000);
  });

  it("la última cuota absorbe el redondeo", () => {
    const plan = calcularCuotas({ ...base, total: 100_000, numeroCuotas: 3 });

    expect(plan.cuotas.map((c) => c.monto)).toEqual([33_333, 33_333, 33_334]);
  });

  it("redondea el interés a pesos enteros", () => {
    const plan = calcularCuotas({
      ...base,
      total: 100_001,
      interesPorcentaje: 2.5,
      numeroCuotas: 2,
    });

    expect(plan.interesMonto).toBe(2_500);
    expect(plan.cuotas.reduce((s, c) => s + c.monto, 0)).toBe(plan.totalAPagar);
  });

  it("usa 7 días en semanal y 15 en quincenal", () => {
    const semanal = calcularCuotas({ ...base, periodicidad: "semanal" });
    const quincenal = calcularCuotas({ ...base, periodicidad: "quincenal" });

    expect(semanal.cuotas.map((c) => c.vence)).toEqual([
      "2026-12-10",
      "2026-12-17",
      "2026-12-24",
      "2026-12-31",
    ]);
    expect(quincenal.cuotas[1].vence).toBe("2026-12-25");
  });
});

describe("repartirPagos", () => {
  const cuotas = [
    { numero: 1, vence: "2026-11-10", monto: 100 },
    { numero: 2, vence: "2026-12-10", monto: 100 },
    { numero: 3, vence: "2027-01-10", monto: 100 },
  ];

  it("cubre las cuotas en orden y deja una parcial", () => {
    const res = repartirPagos(cuotas, 150, "2026-11-25");

    expect(res.map((o) => [o.pagado, o.pendiente, o.estado])).toEqual([
      [100, 0, "pagada"],
      [50, 50, "parcial"],
      [0, 100, "pendiente"],
    ]);
  });

  it("marca vencida la cuota con saldo cuya fecha ya pasó", () => {
    const res = repartirPagos(cuotas, 0, "2026-11-25");

    expect(res[0].estado).toBe("vencida");
    expect(res[1].estado).toBe("pendiente");
  });

  it("una cuota pagada a tiempo no figura vencida aunque la fecha pasó", () => {
    expect(repartirPagos(cuotas, 100, "2026-11-25")[0].estado).toBe("pagada");
  });

  it("permite adelantar cuotas", () => {
    const res = repartirPagos(cuotas, 300, "2026-11-25");

    expect(res.every((o) => o.estado === "pagada")).toBe(true);
  });
});

describe("obligacionesDe", () => {
  const factura = {
    total: 1_000,
    interesMonto: 0,
    vence: null as string | null,
    cuotas: [] as { numero: number; vence: string; monto: number }[],
  };

  it("una factura libre no tiene fechas límite", () => {
    expect(
      obligacionesDe({ ...factura, modalidad: "libre" }, 0, "2026-11-25"),
    ).toEqual([]);
  });

  it("con plazo hay una sola obligación por el total", () => {
    const res = obligacionesDe(
      { ...factura, modalidad: "plazo", vence: "2026-11-20" },
      400,
      "2026-11-25",
    );

    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ pendiente: 600, estado: "vencida" });
  });

  it("a cuotas usa el calendario guardado", () => {
    const res = obligacionesDe(
      {
        ...factura,
        modalidad: "cuotas",
        cuotas: [{ numero: 1, vence: "2026-12-01", monto: 1_000 }],
      },
      0,
      "2026-11-25",
    );

    expect(res[0].estado).toBe("pendiente");
  });
});

describe("estadoDeFactura", () => {
  const vencida = [
    {
      numero: 1,
      vence: "2026-11-01",
      monto: 1,
      pagado: 0,
      pendiente: 1,
      estado: "vencida" as const,
    },
  ];

  it("pagada cuando no queda saldo, aunque haya cuotas viejas", () => {
    expect(estadoDeFactura(0, 100, vencida)).toBe("pagada");
  });

  it("vencida gana sobre parcial", () => {
    expect(estadoDeFactura(50, 50, vencida)).toBe("vencida");
  });

  it("parcial si hay abonos y nada vencido; pendiente si no hay abonos", () => {
    expect(estadoDeFactura(50, 50, [])).toBe("parcial");
    expect(estadoDeFactura(100, 0, [])).toBe("pendiente");
  });
});
