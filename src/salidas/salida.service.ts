import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { rangoDelMes } from "../common/month-range";
import { FilesService } from "../files/files.service";
import { ImagenDto } from "../common/dtos/imagen.dto";
import { Factura } from "../facturas/factura.entity";
import { CreateSalidaDto } from "./dtos/create-salida.dto";
import { SalidaImagen } from "./salida-imagen.entity";
import { Salida } from "./salida.entity";

const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class SalidaService {
  constructor(
    @InjectRepository(Salida) private readonly salidas: Repository<Salida>,
    private readonly files: FilesService,
  ) {}

  /**
   * Sube los soportes y guarda salida y soportes en una transacción (el `save`
   * de TypeORM con cascada la abre). Si la base falla, borra lo recién subido.
   */
  async create(
    dto: CreateSalidaDto,
    archivos: Express.Multer.File[] = [],
  ): Promise<Salida> {
    this.files.validarLote(archivos, 0);
    const subidos = await this.files.uploadAll(archivos);

    let guardada: Salida;
    try {
      guardada = await this.guardar(
        this.salidas.create({
          ...this.datos(dto),
          imagenes: subidos.map((i) => this.imagen(i)),
        }),
      );
    } catch (error) {
      await this.files.deleteFiles(subidos.map((s) => s.publicId));
      throw error;
    }
    return this.findOne(guardada.id);
  }

  findAll(): Promise<Salida[]> {
    return this.salidas.find({
      order: { fecha: "DESC", id: "DESC", imagenes: { id: "ASC" } },
    });
  }

  async findOne(id: number): Promise<Salida> {
    const salida = await this.salidas.findOne({
      where: { id },
      order: { imagenes: { id: "ASC" } },
    });
    if (!salida) {
      throw new NotFoundException("La salida no existe.");
    }
    return salida;
  }

  /**
   * Reemplaza los datos y los soportes: se quedan los de `conservar`, se suman
   * los archivos nuevos y se borran de Cloudinary los que sobran.
   */
  async update(
    id: number,
    dto: CreateSalidaDto,
    archivos: Express.Multer.File[] = [],
  ): Promise<Salida> {
    const salida = await this.cargar(id);
    const anteriores = salida.imagenes;
    const conservar = new Set(dto.conservar ?? []);

    if (
      ![...conservar].every((p) => anteriores.some((a) => a.publicId === p))
    ) {
      throw new BadRequestException(
        "Algún soporte a conservar no pertenece a esta salida.",
      );
    }
    this.files.validarLote(archivos, conservar.size);
    const subidos = await this.files.uploadAll(archivos);

    Object.assign(salida, this.datos(dto));
    salida.imagenes = [
      ...anteriores.filter((a) => conservar.has(a.publicId)),
      ...subidos.map((i) => this.imagen(i)),
    ];

    try {
      await this.guardar(salida);
    } catch (error) {
      await this.files.deleteFiles(subidos.map((s) => s.publicId));
      throw error;
    }

    await this.files.deleteFiles(
      anteriores.map((a) => a.publicId).filter((p) => !conservar.has(p)),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const salida = await this.cargar(id);
    await this.salidas.remove(salida);
    await this.files.deleteFiles(salida.imagenes.map((i) => i.publicId));
  }

  /** Salidas de un mes (`YYYY-MM`), de la más reciente a la más antigua. */
  getByMonth(mes: string): Promise<Salida[]> {
    const { desde, hasta } = rangoDelMes(mes);

    return this.salidas
      .createQueryBuilder("salida")
      .leftJoinAndSelect("salida.factura", "factura")
      .leftJoinAndSelect("factura.proveedorRef", "proveedor")
      .leftJoinAndSelect("salida.imagenes", "imagen")
      .where("salida.fecha >= :desde AND salida.fecha < :hasta", {
        desde,
        hasta,
      })
      .orderBy("salida.fecha", "DESC")
      .addOrderBy("salida.id", "DESC")
      .addOrderBy("imagen.id", "ASC")
      .getMany();
  }

  /**
   * La salida con sus soportes pero sin la factura: así `facturaId` es lo
   * único que manda al guardar y no choca con una relación ya cargada.
   */
  private async cargar(id: number): Promise<Salida> {
    const salida = await this.salidas.findOne({
      where: { id },
      relations: { imagenes: true },
      loadEagerRelations: false,
      order: { imagenes: { id: "ASC" } },
    });
    if (!salida) {
      throw new NotFoundException("La salida no existe.");
    }
    return salida;
  }

  private datos({ fecha, total, facturaId, nota }: CreateSalidaDto) {
    return { fecha, total, facturaId: facturaId ?? null, nota: nota ?? null };
  }

  private imagen({ publicId, url }: ImagenDto): SalidaImagen {
    return Object.assign(new SalidaImagen(), { publicId, url });
  }

  private async guardar(salida: Salida): Promise<Salida> {
    try {
      if (!salida.facturaId) {
        return await this.salidas.save(salida);
      }
      return await this.salidas.manager.transaction(async (manager) => {
        await this.validarSaldo(manager, salida);
        return manager.save(salida);
      });
    } catch (error) {
      // El mismo soporte ya está asociado a otra salida.
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          "Alguno de los soportes ya está asociado a otra salida.",
        );
      }
      throw error;
    }
  }

  /**
   * El pago no puede superar lo que falta por pagar de la factura (total más
   * interés, menos los demás abonos). Bloquea la fila de la factura hasta que
   * termine la transacción, para que dos abonos a la vez no la sobrepasen.
   */
  private async validarSaldo(
    manager: EntityManager,
    salida: Salida,
  ): Promise<void> {
    const factura = await manager.findOne(Factura, {
      where: { id: salida.facturaId as number },
      lock: { mode: "pessimistic_write" },
      // Sin el proveedor: un LEFT JOIN no se puede bloquear con FOR UPDATE.
      loadEagerRelations: false,
    });
    if (!factura) {
      throw new BadRequestException("La factura no existe.");
    }

    const fila = await manager
      .createQueryBuilder(Salida, "s")
      .select("COALESCE(SUM(s.total), 0)", "pagado")
      .where("s.facturaId = :facturaId", { facturaId: factura.id })
      // Al editar un pago, el saldo se calcula sin contarlo a él.
      .andWhere("s.id <> :salidaId", { salidaId: salida.id ?? 0 })
      .getRawOne<{ pagado: string }>();

    const saldo = factura.total + factura.interesMonto - Number(fila?.pagado);
    if (salida.total > saldo) {
      throw new BadRequestException(
        `El pago supera lo que falta por pagar de la factura (${saldo}).`,
      );
    }
  }
}
