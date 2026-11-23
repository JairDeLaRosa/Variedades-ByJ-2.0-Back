import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Permiso } from "../../auth/permisos";

const recortar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/** Cuerpo para crear y para editar un rol. */
export class GuardarRolDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: "nombre es obligatorio" })
  @MaxLength(50)
  nombre: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @IsArray()
  @ArrayUnique()
  @IsEnum(Permiso, { each: true, message: "hay un permiso que no existe" })
  permisos: Permiso[];
}
