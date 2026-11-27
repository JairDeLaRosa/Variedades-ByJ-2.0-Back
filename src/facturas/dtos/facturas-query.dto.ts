import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

export const ESTADOS_FILTRO = [
  "pendiente",
  "parcial",
  "pagada",
  "vencida",
] as const;
export type EstadoFiltro = (typeof ESTADOS_FILTRO)[number];

/** Filtros opcionales de `GET api/facturas`. */
export class FacturasQueryDto {
  @IsOptional()
  @IsIn(ESTADOS_FILTRO)
  estado?: EstadoFiltro;

  /** Texto contenido en el proveedor, sin distinguir mayúsculas. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  proveedor?: string;

  /** Solo las facturas de este proveedor. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proveedorId?: number;

  /** Mes de la factura, `YYYY-MM`. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "mes debe ser YYYY-MM" })
  mes?: string;
}
