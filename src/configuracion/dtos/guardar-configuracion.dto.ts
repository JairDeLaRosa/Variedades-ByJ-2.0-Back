import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";

const recortar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/** Un texto vacío es válido: así se borra un dato que ya no aplica. */
const siHayTexto = (_: unknown, valor: unknown) =>
  typeof valor === "string" && valor !== "";

/**
 * Datos del negocio, enviados como `multipart/form-data` junto con el logo
 * nuevo (campo `logo`). Los textos vacíos borran el dato; el logo actual se
 * conserva salvo que llegue uno nuevo o `quitarLogo` sea `true`.
 */
export class GuardarConfiguracionDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: "El nombre del negocio es obligatorio" })
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(80)
  eslogan?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(40)
  nit?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(150)
  direccion?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(120)
  correo?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(120)
  horario?: string;

  @IsOptional()
  @Transform(recortar)
  @ValidateIf(siHayTexto)
  @Matches(/^https?:\/\/\S+$/i, { message: "facebook debe ser un enlace" })
  @MaxLength(200)
  facebook?: string;

  @IsOptional()
  @Transform(recortar)
  @ValidateIf(siHayTexto)
  @Matches(/^https?:\/\/\S+$/i, { message: "instagram debe ser un enlace" })
  @MaxLength(200)
  instagram?: string;

  /** Solo el número (con o sin indicativo); con él se arma el enlace al chat. */
  @IsOptional()
  @Transform(recortar)
  @ValidateIf(siHayTexto)
  @Matches(/^[+\d\s()-]{7,30}$/, {
    message: "whatsapp debe ser un número de teléfono",
  })
  whatsapp?: string;

  /** Una línea por dato: banco, número de cuenta, titular... */
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(500)
  cuentaTransferencia?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  quitarLogo?: boolean;
}
