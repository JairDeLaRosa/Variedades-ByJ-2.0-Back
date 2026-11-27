import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FacturaService, type FacturaVista } from "../facturas/factura.service";
import { CreateProveedorDto } from "./dtos/create-proveedor.dto";
import { ProveedoresQueryDto } from "./dtos/proveedores-query.dto";
import { Proveedor } from "./proveedor.entity";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FK_VIOLATION = "23503";

const MENSAJE_CON_FACTURAS =
  "El proveedor tiene facturas: desactívalo en lugar de eliminarlo.";

/** Lo facturado a un proveedor, lo pagado y lo que se le debe hoy. */
export interface ResumenProveedor {
  facturas: number;
  facturado: number;
  pagado: number;
  saldo: number;
}

export interface ProveedorFila extends Proveedor {
  totalFacturas: number;
  saldo: number;
}

export interface ProveedorDetalle extends Proveedor {
  resumen: ResumenProveedor;
  /** Facturas del proveedor, de la más reciente a la más antigua. */
  facturas: FacturaVista[];
}

const SIN_MOVIMIENTO: ResumenProveedor = {
  facturas: 0,
  facturado: 0,
  pagado: 0,
  saldo: 0,
};

@Injectable()
export class ProveedorService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedores: Repository<Proveedor>,
    private readonly facturaService: FacturaService,
  ) {}

  async create(dto: CreateProveedorDto): Promise<Proveedor> {
    try {
      return await this.proveedores.save(
        this.proveedores.create({
          ...this.datos(dto),
          activo: dto.activo ?? true,
        }),
      );
    } catch (error) {
      throw this.traducir(error);
    }
  }

  /** Proveedores por nombre, cada uno con su número de facturas y su saldo. */
  async findAll(filtros: ProveedoresQueryDto = {}): Promise<ProveedorFila[]> {
    const consulta = this.proveedores.createQueryBuilder("p");
    if (filtros.activo !== undefined) {
      consulta.andWhere("p.activo = :activo", { activo: filtros.activo });
    }
    if (filtros.buscar) {
      consulta.andWhere(
        "(p.nombre ILIKE :buscar OR p.nit ILIKE :buscar OR p.contacto ILIKE :buscar)",
        { buscar: `%${filtros.buscar.replace(/[\\%_]/g, "\\$&")}%` },
      );
    }
    const filas = await consulta.orderBy("lower(p.nombre)", "ASC").getMany();
    const resumenes = await this.resumenes(filas.map((p) => p.id));

    return filas.map((p) => {
      const r = resumenes.get(p.id) ?? SIN_MOVIMIENTO;
      return { ...p, totalFacturas: r.facturas, saldo: r.saldo };
    });
  }

  async findOne(id: number): Promise<ProveedorDetalle> {
    const proveedor = await this.cargar(id);
    const [resumenes, facturas] = await Promise.all([
      this.resumenes([id]),
      this.facturaService.findAll({ proveedorId: id }),
    ]);
    return {
      ...proveedor,
      resumen: resumenes.get(id) ?? SIN_MOVIMIENTO,
      facturas,
    };
  }

  /** Reemplaza los datos; si no viene `activo`, se conserva el actual. */
  async update(id: number, dto: CreateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.cargar(id);
    Object.assign(proveedor, this.datos(dto), {
      activo: dto.activo ?? proveedor.activo,
    });
    try {
      return await this.proveedores.save(proveedor);
    } catch (error) {
      throw this.traducir(error);
    }
  }

  async remove(id: number): Promise<void> {
    const proveedor = await this.cargar(id);
    try {
      await this.proveedores.remove(proveedor);
    } catch (error) {
      if (error?.code === PG_FK_VIOLATION) {
        throw new ConflictException(MENSAJE_CON_FACTURAS);
      }
      throw error;
    }
  }

  private async cargar(id: number): Promise<Proveedor> {
    const proveedor = await this.proveedores.findOneBy({ id });
    if (!proveedor) {
      throw new NotFoundException("El proveedor no existe.");
    }
    return proveedor;
  }

  /** Facturas, facturado (con interés), pagado y saldo de cada proveedor, en una sola consulta. */
  private async resumenes(
    ids: number[],
  ): Promise<Map<number, ResumenProveedor>> {
    if (ids.length === 0) return new Map();
    const filas: {
      proveedorId: number;
      facturas: string;
      facturado: string;
      pagado: string;
    }[] = await this.proveedores.query(
      `
      SELECT f.proveedor_id AS "proveedorId",
             COUNT(*) AS facturas,
             SUM(f.total + f.interes_monto) AS facturado,
             COALESCE(SUM(p.pagado), 0) AS pagado
      FROM facturas f
      LEFT JOIN (
        SELECT factura_id, SUM(total) AS pagado
        FROM salidas
        WHERE factura_id IS NOT NULL
        GROUP BY factura_id
      ) p ON p.factura_id = f.id
      WHERE f.proveedor_id = ANY($1)
      GROUP BY f.proveedor_id
    `,
      [ids],
    );
    return new Map(
      filas.map((f) => {
        const facturado = Number(f.facturado);
        const pagado = Number(f.pagado);
        return [
          Number(f.proveedorId),
          {
            facturas: Number(f.facturas),
            facturado,
            pagado,
            saldo: facturado - pagado,
          },
        ];
      }),
    );
  }

  /** Lo opcional que no viene queda en `null`: un PUT reemplaza todo. */
  private datos(dto: CreateProveedorDto) {
    return {
      nombre: dto.nombre,
      nit: dto.nit ?? null,
      contacto: dto.contacto ?? null,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
      direccion: dto.direccion ?? null,
      notas: dto.notas ?? null,
    };
  }

  private traducir(error: unknown): unknown {
    const falla = error as { code?: string };
    if (falla?.code !== PG_UNIQUE_VIOLATION) return error;
    return new ConflictException("Ya existe un proveedor con ese nombre.");
  }
}
