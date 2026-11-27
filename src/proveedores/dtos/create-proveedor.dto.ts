import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const recortar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/** Un texto vacío cuenta como «sin dato». */
const vacioAUndefined = ({ value }: { value: unknown }) => {
  const texto = recortar({ value });
  return texto === "" ? undefined : texto;
};

/** Crear o reemplazar un proveedor: solo `nombre` es obligatorio. */
export class CreateProveedorDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(30)
  nit?: string;

  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(100)
  contacto?: string;

  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @Transform(vacioAUndefined)
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(500)
  notas?: string;

  /** Al crear es `true` por defecto; al editar, si no viene se conserva. */
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
