import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ImagenDto } from "../../common/dtos/imagen.dto";

export class CreateSalidaDto {
  /** Día de la compra, `YYYY-MM-DD`. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "fecha debe ser YYYY-MM-DD" })
  @IsISO8601({ strict: true }, { message: "fecha no es una fecha válida" })
  fecha: string;

  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  total: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  factura: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tienda: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ImagenDto)
  imagenes: ImagenDto[];
}
