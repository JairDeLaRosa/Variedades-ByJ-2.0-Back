import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { MAX_ARCHIVOS } from "../../files/archivos";
import {
  MODALIDADES,
  PERIODICIDADES,
  type Modalidad,
  type Periodicidad,
} from "../calculos";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esPlazo = (o: CreateFacturaDto) => o.modalidad === "plazo";
const esCuotas = (o: CreateFacturaDto) => o.modalidad === "cuotas";
const recortar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateFacturaDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  numero: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  proveedor: string;

  /** Día de la factura, `YYYY-MM-DD`. */
  @Matches(FECHA, { message: "fecha debe ser YYYY-MM-DD" })
  @IsISO8601({ strict: true }, { message: "fecha no es una fecha válida" })
  fecha: string;

  // En multipart todo llega como texto: `@Type` lo convierte a número.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  total: number;

  @IsIn(MODALIDADES)
  modalidad: Modalidad;

  /** Fecha límite de pago; obligatoria con modalidad `plazo`. */
  @ValidateIf(esPlazo)
  @Matches(FECHA, { message: "vence debe ser YYYY-MM-DD" })
  @IsISO8601({ strict: true }, { message: "vence no es una fecha válida" })
  vence?: string;

  /** Obligatorios con modalidad `cuotas`. */
  @ValidateIf(esCuotas)
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(60)
  numeroCuotas?: number;

  @ValidateIf(esCuotas)
  @IsIn(PERIODICIDADES)
  periodicidad?: Periodicidad;

  /** Fecha de la primera cuota, `YYYY-MM-DD`. */
  @ValidateIf(esCuotas)
  @Matches(FECHA, { message: "primeraCuota debe ser YYYY-MM-DD" })
  @IsISO8601(
    { strict: true },
    { message: "primeraCuota no es una fecha válida" },
  )
  primeraCuota?: string;

  /** Interés simple sobre el total, de 0 a 100 (por defecto 0). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  interesPorcentaje?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : recortar({ value }),
  )
  @IsString()
  @MaxLength(500)
  notas?: string;

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
