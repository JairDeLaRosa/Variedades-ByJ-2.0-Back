import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ImagenDto } from "../../common/dtos/imagen.dto";

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

  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  precioUnidad: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number;

  /** Porcentaje de 0 a 100. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  descuento?: number;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ImagenDto)
  imagenes: ImagenDto[];
}
