import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { rangoDelMes } from "../common/month-range";
import { FilesService } from "../files/files.service";
import { CreateSalidaDto, ImagenDto } from "./dtos/create-salida.dto";
import { SalidaImagen } from "./salida-imagen.entity";
import { Salida } from "./salida.entity";

const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class SalidaService {
  constructor(
    @InjectRepository(Salida) private readonly salidas: Repository<Salida>,
    private readonly files: FilesService,
  ) {}

  create(dto: CreateSalidaDto): Promise<Salida> {
    return this.guardar(
      this.salidas.create({
        ...this.datos(dto),
        imagenes: dto.imagenes.map((i) => this.imagen(i)),
      }),
    );
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

  /** Reemplaza los datos y el conjunto de soportes; borra los que sobran. */
  async update(id: number, dto: CreateSalidaDto): Promise<Salida> {
    const salida = await this.findOne(id);
    const anteriores = salida.imagenes;
    const nuevos = new Set(dto.imagenes.map((i) => i.publicId));

    Object.assign(salida, this.datos(dto));
    salida.imagenes = dto.imagenes.map(
      (i) =>
        anteriores.find((a) => a.publicId === i.publicId) ?? this.imagen(i),
    );

    const guardada = await this.guardar(salida);

    await this.files.deleteFiles(
      anteriores.map((a) => a.publicId).filter((p) => !nuevos.has(p)),
    );
    return guardada;
  }

  async remove(id: number): Promise<void> {
    const salida = await this.findOne(id);
    await this.salidas.remove(salida);
    await this.files.deleteFiles(salida.imagenes.map((i) => i.publicId));
  }

  /** Salidas de un mes (`YYYY-MM`), de la más reciente a la más antigua. */
  getByMonth(mes: string): Promise<Salida[]> {
    const { desde, hasta } = rangoDelMes(mes);

    return this.salidas
      .createQueryBuilder("salida")
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

  private datos({ fecha, total, factura, tienda }: CreateSalidaDto) {
    return { fecha, total, factura, tienda };
  }

  private imagen({ publicId, url }: ImagenDto): SalidaImagen {
    return Object.assign(new SalidaImagen(), { publicId, url });
  }

  private async guardar(salida: Salida): Promise<Salida> {
    try {
      return await this.salidas.save(salida);
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
}
