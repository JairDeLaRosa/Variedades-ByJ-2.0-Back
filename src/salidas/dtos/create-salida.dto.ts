import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { MAX_ARCHIVOS } from "../../files/archivos";

export class CreateSalidaDto {
  /** Día de la compra, `YYYY-MM-DD`. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "fecha debe ser YYYY-MM-DD" })
  @IsISO8601({ strict: true }, { message: "fecha no es una fecha válida" })
  fecha: string;

  // En multipart todo llega como texto: `@Type` lo convierte a número.
  @Type(() => Number)
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

  /**
   * `publicId` de los soportes actuales que se quedan al editar. Los nuevos
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
