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

export class ImagenDto {
  /** Identificador en Cloudinary, dentro de la carpeta `docs`. */
  @Matches(/^docs\/[A-Za-z0-9_-]+$/, { message: "publicId no es válido" })
  publicId: string;

  @Matches(/^https:\/\/res\.cloudinary\.com\//, {
    message: "url debe ser de Cloudinary",
  })
  @MaxLength(500)
  url: string;
}

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
