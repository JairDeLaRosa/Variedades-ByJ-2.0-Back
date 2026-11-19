import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ImagenDto } from "../common/dtos/imagen.dto";
import { FilesService } from "../files/files.service";
import { CreateProductoDto } from "./dtos/create-producto.dto";
import { ProductoImagen } from "./producto-imagen.entity";
import { Producto } from "./producto.entity";

const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly productos: Repository<Producto>,
    private readonly files: FilesService,
  ) {}

  create(dto: CreateProductoDto): Promise<Producto> {
    return this.guardar(
      this.productos.create({
        ...this.datos(dto),
        imagenes: dto.imagenes.map((i) => this.imagen(i)),
      }),
    );
  }

  findAll(categoria?: string): Promise<Producto[]> {
    return this.productos.find({
      where: categoria ? { categoria } : {},
      order: { id: "DESC", imagenes: { id: "ASC" } },
    });
  }

  async findOne(id: number): Promise<Producto> {
    const producto = await this.productos.findOne({
      where: { id },
      order: { imagenes: { id: "ASC" } },
    });
    if (!producto) {
      throw new NotFoundException("El producto no existe.");
    }
    return producto;
  }

  /** Reemplaza los datos y las fotos; borra de Cloudinary las que sobran. */
  async update(id: number, dto: CreateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);
    const anteriores = producto.imagenes;
    const nuevas = new Set(dto.imagenes.map((i) => i.publicId));

    Object.assign(producto, this.datos(dto));
    producto.imagenes = dto.imagenes.map(
      (i) =>
        anteriores.find((a) => a.publicId === i.publicId) ?? this.imagen(i),
    );

    const guardado = await this.guardar(producto);

    await this.files.deleteFiles(
      anteriores.map((a) => a.publicId).filter((p) => !nuevas.has(p)),
    );
    return guardado;
  }

  async remove(id: number): Promise<void> {
    const producto = await this.findOne(id);
    await this.productos.remove(producto);
    await this.files.deleteFiles(producto.imagenes.map((i) => i.publicId));
  }

  private datos(dto: CreateProductoDto) {
    const { nombre, descripcion, categoria, precioUnidad, stock, descuento } =
      dto;
    return { nombre, descripcion, categoria, precioUnidad, stock, descuento };
  }

  private imagen({ publicId, url }: ImagenDto): ProductoImagen {
    return Object.assign(new ProductoImagen(), { publicId, url });
  }

  private async guardar(producto: Producto): Promise<Producto> {
    try {
      return await this.productos.save(producto);
    } catch (error) {
      // La misma foto ya está asociada a otro producto.
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          "Alguna de las fotos ya está asociada a otro producto.",
        );
      }
      throw error;
    }
  }
}
