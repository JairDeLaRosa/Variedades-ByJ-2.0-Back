import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { MAX_ARCHIVOS } from "../../files/archivos";

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria: string;

  // En multipart todo llega como texto: `@Type` lo convierte a número.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  precioUnidad: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number;

  /** Unidades desde las que se avisa «stock bajo»; si no llega, 5 al crear o el actual al editar. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockMinimo?: number;

  /** Porcentaje de 0 a 100. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  descuento?: number;

  /**
   * `publicId` de las fotos actuales que se quedan al editar. Las fotos nuevas
   * llegan como archivos en el campo `imagenes`.
   */
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayMaxSize(MAX_ARCHIVOS)
  @Matches(/^docs\/[A-Za-z0-9_-]+$/, {
    each: true,
    message: "conservar tiene un publicId no válido",
  })
  conservar?: string[];
}
