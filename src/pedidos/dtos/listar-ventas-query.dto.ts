import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CanalPedido } from "../pedido.constantes";

export class ListarVentasQueryDto {
  @IsOptional()
  @IsEnum(CanalPedido)
  canal?: CanalPedido;

  /** Comprobante (`CV-12`), pedido (`PED-12`) o parte del nombre del cliente. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
