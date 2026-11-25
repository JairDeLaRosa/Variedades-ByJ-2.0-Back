import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { rangoDelMes } from "../common/month-range";
import { ImagenDto } from "../common/dtos/imagen.dto";
import { FilesService } from "../files/files.service";
import { Salida } from "../salidas/salida.entity";
import {
  calcularCuotas,
  estadoDeFactura,
  hoyNegocio,
  obligacionesDe,
  sumarDias,
  type CuotaCalculada,
  type EstadoPago,
  type Obligacion,
  type PlanCuotas,
  type Periodicidad,
} from "./calculos";
import { CreateFacturaDto } from "./dtos/create-factura.dto";
import { FacturasQueryDto } from "./dtos/facturas-query.dto";
import { SimularCuotasQueryDto } from "./dtos/simular-cuotas-query.dto";
import { FacturaCuota } from "./factura-cuota.entity";
import { FacturaImagen } from "./factura-imagen.entity";
import { Factura } from "./factura.entity";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FK_VIOLATION = "23503";
const DIAS_POR_VENCER = 7;
const CANTIDAD_MAS_DEUDA = 5;

const MENSAJE_CON_PAGOS =
  "La factura tiene pagos registrados: elimínalos antes de borrarla.";

/** Factura con lo que se debe, lo pagado y su estado. */
export interface FacturaVista {
  id: number;
  numero: string;
  proveedor: string;
  fecha: string;
  total: number;
  modalidad: Factura["modalidad"];
  vence: string | null;
  periodicidad: Periodicidad | null;
  interesPorcentaje: number;
  interesMonto: number;
  notas: string | null;
  /** Total más interés. */
  totalAPagar: number;
  pagado: number;
  saldo: number;
  estado: EstadoPago;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacturaDetalle extends FacturaVista {
  /** Calendario con el estado de cada cuota; vacío si no es a cuotas. */
  cuotas: Obligacion[];
  imagenes: FacturaImagen[];
  /** Pagos (salidas) de la factura, del más reciente al más antiguo. */
  abonos: Salida[];
}

export interface ResumenFacturas {
  /** Suma de lo que hay que pagar por todas las facturas (con interés). */
  facturado: number;
  pagado: number;
  porPagar: number;
  /** Lo que ya debió pagarse según plazos y cuotas. */
  vencido: number;
  /** Lo que vence en los próximos 7 días. */
  porVencer7Dias: number;
  facturasConSaldo: number;
  masDeuda: {
    id: number;
    numero: string;
    proveedor: string;
    saldo: number;
    estado: EstadoPago;
  }[];
}

/** Los campos de la factura según su modalidad; ignora los de las otras. */
function construirDatos(dto: CreateFacturaDto) {
  const base = {
    numero: dto.numero,
    proveedor: dto.proveedor,
    fecha: dto.fecha,
    total: dto.total,
    modalidad: dto.modalidad,
    notas: dto.notas ?? null,
    vence: null as string | null,
    periodicidad: null as Periodicidad | null,
    interesPorcentaje: 0,
    interesMonto: 0,
    cuotas: [] as CuotaCalculada[],
  };

  if (dto.modalidad === "plazo") {
    return { ...base, vence: dto.vence as string };
  }
  if (dto.modalidad === "cuotas") {
    const interesPorcentaje = dto.interesPorcentaje ?? 0;
    const plan = calcularCuotas({
      total: dto.total,
      interesPorcentaje,
      numeroCuotas: dto.numeroCuotas as number,
      periodicidad: dto.periodicidad as Periodicidad,
      primeraCuota: dto.primeraCuota as string,
    });
    return {
      ...base,
      periodicidad: dto.periodicidad as Periodicidad,
      interesPorcentaje,
      interesMonto: plan.interesMonto,
      cuotas: plan.cuotas,
    };
  }
  return base;
}

type DatosFactura = ReturnType<typeof construirDatos>;

@Injectable()
export class FacturaService {
  constructor(
    @InjectRepository(Factura) private readonly facturas: Repository<Factura>,
    @InjectRepository(Salida) private readonly salidas: Repository<Salida>,
    private readonly files: FilesService,
  ) {}

  /** Sube los soportes y guarda factura, cuotas y soportes en una transacción. */
  async create(
    dto: CreateFacturaDto,
    archivos: Express.Multer.File[] = [],
  ): Promise<FacturaDetalle> {
    this.files.validarLote(archivos, 0);
    const subidos = await this.files.uploadAll(archivos);

    let guardada: Factura;
    try {
      guardada = await this.facturas.save(
        this.facturas.create({
          ...construirDatos(dto),
          imagenes: subidos.map((i) => this.imagen(i)),
        }),
      );
    } catch (error) {
      await this.files.deleteFiles(subidos.map((s) => s.publicId));
      throw this.traducir(error);
    }
    return this.findOne(guardada.id);
  }

  async findAll(filtros: FacturasQueryDto = {}): Promise<FacturaVista[]> {
    const hoy = hoyNegocio();
    const filas = await this.cargar(filtros);
    const pagados = await this.pagados(filas.map((f) => f.id));

    return filas
      .map((f) => this.calcular(f, pagados.get(f.id) ?? 0, hoy).vista)
      .filter((v) => !filtros.estado || v.estado === filtros.estado);
  }

  /** Lo facturado, lo pagado y lo que se debe, con vencidos y próximos a vencer. */
  async resumen(): Promise<ResumenFacturas> {
    const hoy = hoyNegocio();
    const limite = sumarDias(hoy, DIAS_POR_VENCER);
    const filas = await this.cargar({});
    const pagados = await this.pagados(filas.map((f) => f.id));

    const resumen: ResumenFacturas = {
      facturado: 0,
      pagado: 0,
      porPagar: 0,
      vencido: 0,
      porVencer7Dias: 0,
      facturasConSaldo: 0,
      masDeuda: [],
    };
    for (const factura of filas) {
      const { vista, obligaciones } = this.calcular(
        factura,
        pagados.get(factura.id) ?? 0,
        hoy,
      );
      resumen.facturado += vista.totalAPagar;
      resumen.pagado += vista.pagado;
      for (const o of obligaciones) {
        if (o.pendiente === 0) continue;
        if (o.vence < hoy) resumen.vencido += o.pendiente;
        else if (o.vence <= limite) resumen.porVencer7Dias += o.pendiente;
      }
      if (vista.saldo > 0) {
        resumen.masDeuda.push({
          id: vista.id,
          numero: vista.numero,
          proveedor: vista.proveedor,
          saldo: vista.saldo,
          estado: vista.estado,
        });
      }
    }
    resumen.porPagar = resumen.facturado - resumen.pagado;
    resumen.facturasConSaldo = resumen.masDeuda.length;
    resumen.masDeuda = resumen.masDeuda
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, CANTIDAD_MAS_DEUDA);
    return resumen;
  }

  /** Calendario de cuotas sin guardar nada: una sola fórmula para el formulario. */
  simular(query: SimularCuotasQueryDto): PlanCuotas {
    return calcularCuotas({
      total: query.total,
      interesPorcentaje: query.interesPorcentaje ?? 0,
      numeroCuotas: query.numeroCuotas,
      periodicidad: query.periodicidad,
      primeraCuota: query.primeraCuota,
    });
  }

  async findOne(id: number): Promise<FacturaDetalle> {
    const factura = await this.facturas.findOne({
      where: { id },
      relations: { cuotas: true, imagenes: true },
      order: { cuotas: { numero: "ASC" }, imagenes: { id: "ASC" } },
    });
    if (!factura) {
      throw new NotFoundException("La factura no existe.");
    }

    const pagado = (await this.pagados([id])).get(id) ?? 0;
    const { vista, obligaciones } = this.calcular(
      factura,
      pagado,
      hoyNegocio(),
    );
    const abonos = await this.salidas.find({
      where: { facturaId: id },
      relations: { imagenes: true },
      loadEagerRelations: false,
      order: { fecha: "DESC", id: "DESC", imagenes: { id: "ASC" } },
    });

    return {
      ...vista,
      cuotas: factura.modalidad === "cuotas" ? obligaciones : [],
      imagenes: factura.imagenes,
      abonos,
    };
  }

  /**
   * Reemplaza los datos y los soportes (como las salidas). Con pagos
   * registrados no se puede cambiar la modalidad ni el calendario de cuotas, y
   * el total de una factura sin cuotas no puede quedar por debajo de lo pagado.
   */
  async update(
    id: number,
    dto: CreateFacturaDto,
    archivos: Express.Multer.File[] = [],
  ): Promise<FacturaDetalle> {
    const factura = await this.cargarConSoportes(id);
    const anteriores = factura.imagenes;
    const conservar = new Set(dto.conservar ?? []);

    if (
      ![...conservar].every((p) => anteriores.some((a) => a.publicId === p))
    ) {
      throw new BadRequestException(
        "Algún soporte a conservar no pertenece a esta factura.",
      );
    }
    this.files.validarLote(archivos, conservar.size);
    const nuevo = construirDatos(dto);
    const subidos = await this.files.uploadAll(archivos);

    try {
      await this.facturas.manager.transaction(async (manager) => {
        // Bloquea la factura: un abono a la vez no cambia lo validado abajo.
        await manager.findOne(Factura, {
          where: { id },
          lock: { mode: "pessimistic_write" },
        });
        const fila = await manager
          .createQueryBuilder(Salida, "s")
          .select("COALESCE(SUM(s.total), 0)", "pagado")
          .addSelect("COUNT(*)", "pagos")
          .where("s.facturaId = :id", { id })
          .getRawOne<{ pagado: string; pagos: string }>();
        const pagado = Number(fila?.pagado ?? 0);
        const conPagos = Number(fila?.pagos ?? 0) > 0;

        if (conPagos) {
          await this.validarConPagos(factura, nuevo, pagado);
        }

        const { cuotas, ...datos } = nuevo;
        Object.assign(factura, datos);
        factura.imagenes = [
          ...anteriores.filter((a) => conservar.has(a.publicId)),
          ...subidos.map((i) => this.imagen(i)),
        ];
        if (!conPagos) {
          await manager
            .createQueryBuilder()
            .delete()
            .from(FacturaCuota)
            .where("factura_id = :id", { id })
            .execute();
          factura.cuotas = cuotas.map((c) =>
            Object.assign(new FacturaCuota(), c),
          );
        }
        await manager.save(factura);
      });
    } catch (error) {
      await this.files.deleteFiles(subidos.map((s) => s.publicId));
      throw this.traducir(error);
    }

    await this.files.deleteFiles(
      anteriores.map((a) => a.publicId).filter((p) => !conservar.has(p)),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const factura = await this.cargarConSoportes(id);
    if ((await this.salidas.count({ where: { facturaId: id } })) > 0) {
      throw new ConflictException(MENSAJE_CON_PAGOS);
    }
    try {
      await this.facturas.remove(factura);
    } catch (error) {
      // Un pago entró entre la comprobación y el borrado.
      if (error?.code === PG_FK_VIOLATION) {
        throw new ConflictException(MENSAJE_CON_PAGOS);
      }
      throw error;
    }
    await this.files.deleteFiles(factura.imagenes.map((i) => i.publicId));
  }

  /** Facturas con sus cuotas, de la más reciente a la más antigua. */
  private cargar({
    proveedor,
    mes,
  }: Pick<FacturasQueryDto, "proveedor" | "mes">): Promise<Factura[]> {
    const consulta = this.facturas
      .createQueryBuilder("f")
      .leftJoinAndSelect("f.cuotas", "c");

    if (proveedor) {
      consulta.andWhere("f.proveedor ILIKE :proveedor", {
        proveedor: `%${proveedor.replace(/[\\%_]/g, "\\$&")}%`,
      });
    }
    if (mes) {
      const { desde, hasta } = rangoDelMes(mes);
      consulta.andWhere("f.fecha >= :desde AND f.fecha < :hasta", {
        desde,
        hasta,
      });
    }
    return consulta
      .orderBy("f.fecha", "DESC")
      .addOrderBy("f.id", "DESC")
      .addOrderBy("c.numero", "ASC")
      .getMany();
  }

  /** La factura con sus soportes, sin cuotas: para editarla o borrarla. */
  private async cargarConSoportes(id: number): Promise<Factura> {
    const factura = await this.facturas.findOne({
      where: { id },
      relations: { imagenes: true },
      order: { imagenes: { id: "ASC" } },
    });
    if (!factura) {
      throw new NotFoundException("La factura no existe.");
    }
    return factura;
  }

  /** Lo pagado de cada factura (suma de sus salidas), en una sola consulta. */
  private async pagados(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const filas = await this.salidas
      .createQueryBuilder("s")
      .select("s.facturaId", "facturaId")
      .addSelect("SUM(s.total)", "pagado")
      .where("s.facturaId IN (:...ids)", { ids })
      .groupBy("s.facturaId")
      .getRawMany<{ facturaId: number; pagado: string }>();
    return new Map(filas.map((f) => [Number(f.facturaId), Number(f.pagado)]));
  }

  private calcular(factura: Factura, pagado: number, hoy: string) {
    const totalAPagar = factura.total + factura.interesMonto;
    const saldo = totalAPagar - pagado;
    const obligaciones = obligacionesDe(factura, pagado, hoy);

    const vista: FacturaVista = {
      id: factura.id,
      numero: factura.numero,
      proveedor: factura.proveedor,
      fecha: factura.fecha,
      total: factura.total,
      modalidad: factura.modalidad,
      vence: factura.vence,
      periodicidad: factura.periodicidad,
      interesPorcentaje: factura.interesPorcentaje,
      interesMonto: factura.interesMonto,
      notas: factura.notas,
      totalAPagar,
      pagado,
      saldo,
      estado: estadoDeFactura(saldo, pagado, obligaciones),
      createdAt: factura.createdAt,
      updatedAt: factura.updatedAt,
    };
    return { vista, obligaciones };
  }

  private async validarConPagos(
    factura: Factura,
    nuevo: DatosFactura,
    pagado: number,
  ): Promise<void> {
    if (nuevo.modalidad !== factura.modalidad) {
      throw new BadRequestException(
        "Con pagos registrados no se puede cambiar la modalidad.",
      );
    }
    if (factura.modalidad === "cuotas") {
      const guardadas = await this.facturas.manager.find(FacturaCuota, {
        where: { factura: { id: factura.id } },
        order: { numero: "ASC" },
      });
      const igual =
        nuevo.total === factura.total &&
        guardadas.length === nuevo.cuotas.length &&
        guardadas.every(
          (c, i) =>
            c.numero === nuevo.cuotas[i].numero &&
            c.vence === nuevo.cuotas[i].vence &&
            c.monto === nuevo.cuotas[i].monto,
        );
      if (!igual) {
        throw new BadRequestException(
          "Con pagos registrados no se puede cambiar el total ni las cuotas.",
        );
      }
    } else if (nuevo.total < pagado) {
      throw new BadRequestException(
        `El total no puede ser menor que lo ya pagado (${pagado}).`,
      );
    }
  }

  private imagen({ publicId, url }: ImagenDto): FacturaImagen {
    return Object.assign(new FacturaImagen(), { publicId, url });
  }

  /** Convierte las violaciones de unicidad en un 409 con un mensaje claro. */
  private traducir(error: unknown): unknown {
    const falla = error as { code?: string; constraint?: string };
    if (falla?.code !== PG_UNIQUE_VIOLATION) return error;
    return new ConflictException(
      falla.constraint === "UQ_facturas_numero"
        ? "Ya existe una factura con ese número."
        : "Alguno de los soportes ya está asociado a otra factura.",
    );
  }
}
