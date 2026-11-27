import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

/** Filtros opcionales de `GET api/proveedores`. */
export class ProveedoresQueryDto {
  /** Texto contenido en el nombre, el NIT o el contacto, sin distinguir mayúsculas. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  buscar?: string;

  /** `true` solo activos, `false` solo desactivados; sin él, todos. */
  @IsOptional()
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsBoolean({ message: "activo debe ser true o false" })
  activo?: boolean;
}
