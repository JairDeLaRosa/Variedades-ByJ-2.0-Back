import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { Permiso } from "../auth/permisos";
import { Factura } from "../facturas/factura.entity";
import { FacturaService } from "../facturas/factura.service";
import { Salida } from "../salidas/salida.entity";
import { Venta } from "../ventas/ventas.entity";
import { RangoQueryDto } from "./dtos/rango-query.dto";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
/** Hasta este número de días la serie es diaria; más allá, mensual. */
const MAX_DIAS_SERIE_DIARIA = 62;
const MAX_DIAS_RANGO = 1100;
const CANTIDAD_RANKING = 5;

export type Granularidad = "dia" | "mes";

export interface PuntoSerie {
  /** `YYYY-MM-DD` si la serie es diaria, `YYYY-MM` si es mensual. */
  periodo: string;
  ventas: number;
  salidas: number;
}

/** Estado actual de las deudas con proveedores; no depende del periodo. */
export interface DeudaReporte {
  /** Lo que falta por pagar de todas las facturas (con interés). */
  porPagar: number;
  /** Lo que ya debió pagarse según plazos y cuotas. */
  vencido: number;
  /** Lo que vence en los próximos 7 días. */
  porVencer7Dias: number;
  facturasConSaldo: number;
  /** Proveedores a los que más se les debe. */
  proveedores: { proveedor: string; saldo: number; facturas: number }[];
}

export interface ReporteResumen {
  desde: string;
  hasta: string;
  granularidad: Granularidad;
  ventas: {
    total: number;
    papeleria: number;
    pinateria: number;
    /** Días con ventas registradas en el rango. */
    dias: number;
  };
  /** Pagos del periodo: los hechos a una factura y los libres (sin factura). */
  salidas: {
    total: number;
    cantidad: number;
    aFacturas: number;
    libres: number;
  };
  /** Facturas con fecha en el periodo; `facturado` incluye el interés. */
  facturas: { cantidad: number; facturado: number };
  /** Lo que se debe hoy; null si quien consulta no puede ver facturas. */
  deuda: DeudaReporte | null;
  /** Ventas menos salidas. */
  balance: number;
  serie: PuntoSerie[];
  /** Proveedores a los que más se pagó. */
  tiendas: { tienda: string; total: number; cantidad: number }[];
  /** Días con más ventas. */
  mejoresDias: { fecha: string; total: number }[];
}

const aNumero = (valor: unknown): number => Number(valor ?? 0);

const aFecha = (texto: string): number => {
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Rechaza fechas que el calendario no tiene, como 2026-02-31.
  const valida =
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia;
  if (!valida) {
    throw new BadRequestException(`La fecha ${texto} no existe.`);
  }
  return fecha.getTime();
};

/** Cantidad de días del rango, contando ambos extremos. */
export function diasDelRango(desde: string, hasta: string): number {
  const dias = Math.round((aFecha(hasta) - aFecha(desde)) / MS_POR_DIA) + 1;
  if (dias < 1) {
    throw new BadRequestException("desde no puede ser posterior a hasta.");
  }
  if (dias > MAX_DIAS_RANGO) {
    throw new BadRequestException(
      `El rango no puede superar ${MAX_DIAS_RANGO} días.`,
    );
  }
  return dias;
}

/** Une ventas y salidas por periodo, de la más antigua a la más reciente. */
export function unirSeries(
  ventas: { periodo: string; total: unknown }[],
  salidas: { periodo: string; total: unknown }[],
): PuntoSerie[] {
  const puntos = new Map<string, PuntoSerie>();
  const punto = (periodo: string) => {
    if (!puntos.has(periodo)) {
      puntos.set(periodo, { periodo, ventas: 0, salidas: 0 });
    }
    return puntos.get(periodo)!;
  };
  ventas.forEach((v) => (punto(v.periodo).ventas = aNumero(v.total)));
  salidas.forEach((s) => (punto(s.periodo).salidas = aNumero(s.total)));
  return [...puntos.values()].sort((a, b) =>
    a.periodo.localeCompare(b.periodo),
  );
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Venta) private readonly ventas: Repository<Venta>,
    @InjectRepository(Salida) private readonly salidas: Repository<Salida>,
    @InjectRepository(Factura) private readonly facturas: Repository<Factura>,
    private readonly facturaService: FacturaService,
  ) {}

  async resumen(
    { desde, hasta }: RangoQueryDto,
    actor: AuthUser,
  ): Promise<ReporteResumen> {
    const dias = diasDelRango(desde, hasta);
    const granularidad: Granularidad =
      dias <= MAX_DIAS_SERIE_DIARIA ? "dia" : "mes";
    // Es una de dos constantes, nunca texto del cliente: puede ir en el SQL.
    const formato = granularidad === "dia" ? "YYYY-MM-DD" : "YYYY-MM";
    const entre = "fecha BETWEEN :desde AND :hasta";

    const [
      totalesVentas,
      totalesSalidas,
      serieVentas,
      serieSalidas,
      tiendas,
      mejoresDias,
      totalesFacturas,
      deuda,
    ] = await Promise.all([
      this.ventas
        .createQueryBuilder("v")
        .select("COALESCE(SUM(v.total), 0)", "total")
        .addSelect("COALESCE(SUM(v.totalPapeleria), 0)", "papeleria")
        .addSelect("COALESCE(SUM(v.totalPinateria), 0)", "pinateria")
        .addSelect("COUNT(*)", "dias")
        .where(`v.${entre}`, { desde, hasta })
        .getRawOne(),
      this.salidas
        .createQueryBuilder("s")
        .select("COALESCE(SUM(s.total), 0)", "total")
        .addSelect("COUNT(*)", "cantidad")
        .addSelect(
          "COALESCE(SUM(s.total) FILTER (WHERE s.facturaId IS NOT NULL), 0)",
          "aFacturas",
        )
        .where(`s.${entre}`, { desde, hasta })
        .getRawOne(),
      this.ventas
        .createQueryBuilder("v")
        .select(`to_char(v.fecha, '${formato}')`, "periodo")
        .addSelect("SUM(v.total)", "total")
        .where(`v.${entre}`, { desde, hasta })
        .groupBy("periodo")
        .getRawMany(),
      this.salidas
        .createQueryBuilder("s")
        .select(`to_char(s.fecha, '${formato}')`, "periodo")
        .addSelect("SUM(s.total)", "total")
        .where(`s.${entre}`, { desde, hasta })
        .groupBy("periodo")
        .getRawMany(),
      // El proveedor sale de la factura; los pagos libres van aparte.
      this.salidas
        .createQueryBuilder("s")
        .leftJoin("s.factura", "f")
        .leftJoin("f.proveedorRef", "pv")
        .leftJoin("s.proveedorRef", "sp")
        .select("COALESCE(pv.nombre, sp.nombre)", "tienda")
        .addSelect("SUM(s.total)", "total")
        .addSelect("COUNT(*)", "cantidad")
        .where(`s.${entre}`, { desde, hasta })
        .groupBy("tienda")
        .orderBy("total", "DESC")
        .limit(CANTIDAD_RANKING)
        .getRawMany(),
      this.ventas
        .createQueryBuilder("v")
        .select("to_char(v.fecha, 'YYYY-MM-DD')", "fecha")
        .addSelect("v.total", "total")
        .where(`v.${entre}`, { desde, hasta })
        .orderBy("v.total", "DESC")
        .addOrderBy("v.fecha", "DESC")
        .limit(CANTIDAD_RANKING)
        .getRawMany(),
      this.facturas
        .createQueryBuilder("f")
        .select("COUNT(*)", "cantidad")
        .addSelect("COALESCE(SUM(f.total + f.interesMonto), 0)", "facturado")
        .where(`f.${entre}`, { desde, hasta })
        .getRawOne(),
      actor.permisos.includes(Permiso.FacturasVer) ? this.deuda() : null,
    ]);

    const ventas = {
      total: aNumero(totalesVentas?.total),
      papeleria: aNumero(totalesVentas?.papeleria),
      pinateria: aNumero(totalesVentas?.pinateria),
      dias: aNumero(totalesVentas?.dias),
    };
    const totalSalidas = aNumero(totalesSalidas?.total);
    const aFacturas = aNumero(totalesSalidas?.aFacturas);
    const salidas = {
      total: totalSalidas,
      cantidad: aNumero(totalesSalidas?.cantidad),
      aFacturas,
      libres: totalSalidas - aFacturas,
    };

    return {
      desde,
      hasta,
      granularidad,
      ventas,
      salidas,
      facturas: {
        cantidad: aNumero(totalesFacturas?.cantidad),
        facturado: aNumero(totalesFacturas?.facturado),
      },
      deuda,
      balance: ventas.total - salidas.total,
      serie: unirSeries(serieVentas, serieSalidas),
      tiendas: tiendas.map((t) => ({
        tienda: t.tienda,
        total: aNumero(t.total),
        cantidad: aNumero(t.cantidad),
      })),
      mejoresDias: mejoresDias.map((d) => ({
        fecha: d.fecha,
        total: aNumero(d.total),
      })),
    };
  }

  /**
   * Lo que se debe hoy. Los totales y los vencimientos los calcula el módulo
   * de facturas; aquí solo se agrega a quién se le debe más.
   */
  private async deuda(): Promise<DeudaReporte> {
    const [resumen, proveedores] = await Promise.all([
      this.facturaService.resumen(),
      this.facturas.query(
        `
        SELECT pv.nombre AS proveedor,
               SUM(f.total + f.interes_monto - COALESCE(p.pagado, 0))::int AS saldo,
               COUNT(*)::int AS facturas
        FROM facturas f
        JOIN proveedores pv ON pv.id = f.proveedor_id
        LEFT JOIN (
          SELECT factura_id, SUM(total) AS pagado
          FROM salidas
          WHERE factura_id IS NOT NULL
          GROUP BY factura_id
        ) p ON p.factura_id = f.id
        WHERE f.total + f.interes_monto > COALESCE(p.pagado, 0)
        GROUP BY pv.id, pv.nombre
        ORDER BY saldo DESC, pv.nombre ASC
        LIMIT $1
      `,
        [CANTIDAD_RANKING],
      ),
    ]);

    return {
      porPagar: resumen.porPagar,
      vencido: resumen.vencido,
      porVencer7Dias: resumen.porVencer7Dias,
      facturasConSaldo: resumen.facturasConSaldo,
      proveedores: proveedores.map(
        (p: { proveedor: string; saldo: number; facturas: number }) => ({
          proveedor: p.proveedor,
          saldo: Number(p.saldo),
          facturas: Number(p.facturas),
        }),
      ),
    };
  }
}
