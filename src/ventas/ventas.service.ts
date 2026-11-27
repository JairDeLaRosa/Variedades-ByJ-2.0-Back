import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { rangoDelMes } from "../common/month-range";
import { Venta } from "./ventas.entity";
import { CreateVentaDto, ResponseCreateRPT } from "./dtos/create-venta.dto";

const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta) private readonly ventas: Repository<Venta>,
  ) {}

  /** Crea el cierre del día, o lo actualiza si ya existía uno para esa fecha. */
  async create(dto: CreateVentaDto): Promise<ResponseCreateRPT> {
    const montos = {
      totalPinateria: dto.totalPinateria,
      totalPapeleria: dto.totalPapeleria,
      // El total siempre se calcula aquí, nunca se confía en el cliente.
      total: dto.totalPinateria + dto.totalPapeleria,
    };

    const existente = await this.ventas.findOneBy({ fecha: dto.fecha });
    const venta = this.ventas.create({
      ...(existente ?? { fecha: dto.fecha }),
      ...montos,
    });

    try {
      const data = await this.ventas.save(venta);
      return {
        ok: true,
        msg: existente ? "Registro actualizado." : "Registro creado.",
        data,
      };
    } catch (error) {
      // Dos cierres simultáneos del mismo día: gana el índice único.
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException("Ya existe una venta para esa fecha.");
      }
      throw error;
    }
  }

  findAll(): Promise<Venta[]> {
    return this.ventas.find({ order: { fecha: "DESC" } });
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventas.findOneBy({ id });
    if (!venta) {
      throw new NotFoundException("La venta no existe.");
    }
    return venta;
  }

  async remove(id: number): Promise<void> {
    const { affected } = await this.ventas.delete({ id });
    if (!affected) {
      throw new NotFoundException("La venta no existe.");
    }
  }

  /** Ventas de un mes (`YYYY-MM`), de la más reciente a la más antigua. */
  getByMonth(mes: string): Promise<Venta[]> {
    const { desde, hasta } = rangoDelMes(mes);

    return this.ventas
      .createQueryBuilder("venta")
      .where("venta.fecha >= :desde AND venta.fecha < :hasta", {
        desde,
        hasta,
      })
      .orderBy("venta.fecha", "DESC")
      .getMany();
  }
}
