import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ImagenDto } from "../common/dtos/imagen.dto";
import { FilesService } from "../files/files.service";
import {
  AjustarStockDto,
  ModoAjuste,
  STOCK_MAXIMO,
} from "./dtos/ajustar-stock.dto";
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

  /**
   * Sube las fotos y guarda producto y fotos en una transacción (el `save` de
   * TypeORM con cascada la abre). Si la base falla, borra lo recién subido.
   */
  async create(
    dto: CreateProductoDto,
    archivos: Express.Multer.File[] = [],
  ): Promise<Producto> {
    this.files.validarLote(archivos, 0);
    const subidas = await this.files.uploadAll(archivos);

    try {
      return await this.guardar(
        this.productos.create({
          ...this.datos(dto),
          imagenes: subidas.map((i) => this.imagen(i)),
        }),
      );
    } catch (error) {
      await this.files.deleteFiles(subidas.map((s) => s.publicId));
      throw error;
    }
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

  /**
   * Reemplaza los datos y las fotos: se quedan las de `conservar`, se suman
   * los archivos nuevos y se borran de Cloudinary las que sobran.
   */
  async update(
    id: number,
    dto: CreateProductoDto,
    archivos: Express.Multer.File[] = [],
  ): Promise<Producto> {
    const producto = await this.findOne(id);
    const anteriores = producto.imagenes;
    const conservar = new Set(dto.conservar ?? []);

    if (
      ![...conservar].every((p) => anteriores.some((a) => a.publicId === p))
    ) {
      throw new BadRequestException(
        "Alguna foto a conservar no pertenece a este producto.",
      );
    }
    this.files.validarLote(archivos, conservar.size);
    const subidas = await this.files.uploadAll(archivos);

    Object.assign(producto, this.datos(dto));
    producto.imagenes = [
      ...anteriores.filter((a) => conservar.has(a.publicId)),
      ...subidas.map((i) => this.imagen(i)),
    ];

    let guardado: Producto;
    try {
      guardado = await this.guardar(producto);
    } catch (error) {
      await this.files.deleteFiles(subidas.map((s) => s.publicId));
      throw error;
    }

    await this.files.deleteFiles(
      anteriores.map((a) => a.publicId).filter((p) => !conservar.has(p)),
    );
    return guardado;
  }

  /**
   * Suma, resta o fija el stock en una sola sentencia SQL, así dos ajustes
   * simultáneos no se pisan. Nunca deja el stock fuera de 0 a STOCK_MAXIMO.
   */
  async ajustarStock(
    id: number,
    { modo, cantidad }: AjustarStockDto,
  ): Promise<Producto> {
    const consulta = this.productos
      .createQueryBuilder()
      .update()
      .where("id = :id", { id })
      .setParameter("cantidad", cantidad);

    if (modo === ModoAjuste.Sumar) {
      consulta
        .set({ stock: () => "stock + :cantidad" })
        .andWhere("stock + :cantidad <= :maximo", { maximo: STOCK_MAXIMO });
    } else if (modo === ModoAjuste.Restar) {
      consulta
        .set({ stock: () => "stock - :cantidad" })
        .andWhere("stock >= :cantidad");
    } else {
      consulta.set({ stock: cantidad });
    }

    const { affected } = await consulta.execute();
    // Nada cambió: o el producto no existe (404) o el ajuste no cabe.
    if (!affected) {
      const actual = await this.findOne(id);
      throw new BadRequestException(
        modo === ModoAjuste.Restar
          ? `No hay suficiente stock: quedan ${actual.stock} unidades.`
          : `El stock no puede superar ${STOCK_MAXIMO} unidades.`,
      );
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const producto = await this.findOne(id);
    await this.productos.remove(producto);
    await this.files.deleteFiles(producto.imagenes.map((i) => i.publicId));
  }

  private datos(dto: CreateProductoDto) {
    const {
      nombre,
      descripcion,
      categoria,
      precioUnidad,
      stock,
      stockMinimo,
      descuento,
    } = dto;
    // Los opcionales que no llegan se omiten: al crear toma el valor por
    // defecto de la base y al editar se conserva el actual.
    return {
      nombre,
      descripcion,
      categoria,
      precioUnidad,
      stock,
      ...(stockMinimo !== undefined && { stockMinimo }),
      ...(descuento !== undefined && { descuento }),
    };
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
