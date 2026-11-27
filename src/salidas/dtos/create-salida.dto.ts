import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { MAX_ARCHIVOS } from "../../files/archivos";

/** En multipart un campo vacío llega como texto vacío: se trata como ausente. */
const vacioAUndefined = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export class CreateSalidaDto {
  /** Día del pago, `YYYY-MM-DD`; lo elige quien lo registra. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "fecha debe ser YYYY-MM-DD" })
  @IsISO8601({ strict: true }, { message: "fecha no es una fecha válida" })
  fecha: string;

  // En multipart todo llega como texto: `@Type` lo convierte a número.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  total: number;

  /** Factura a la que se abona; sin ella el pago es libre y exige `proveedorId`. */
  @IsOptional()
  @Transform(vacioAUndefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  facturaId?: number;

  /**
   * Proveedor de un pago libre: obligatorio si no hay `facturaId`. Con factura
   * se ignora, porque el proveedor es el de la factura.
   */
  @ValidateIf((o: CreateSalidaDto) => !o.facturaId)
  @Transform(vacioAUndefined)
  @Type(() => Number)
  @IsInt({ message: "El proveedor es obligatorio cuando no hay factura" })
  @Min(1, { message: "El proveedor es obligatorio cuando no hay factura" })
  proveedorId?: number;

  /** Opcional: un detalle libre sobre el pago. */
  @IsOptional()
  @Transform(({ value }) => {
    const limpio = vacioAUndefined({ value });
    return typeof limpio === "string" ? limpio.trim() || undefined : limpio;
  })
  @IsString()
  @MaxLength(300)
  nota?: string;

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
