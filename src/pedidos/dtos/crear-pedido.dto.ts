import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  MAX_ITEMS_POR_PEDIDO,
  MAX_UNIDADES_POR_ITEM,
  MetodoPago,
} from "../pedido.constantes";

export class ItemPedidoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_UNIDADES_POR_ITEM)
  cantidad: number;
}

/**
 * Lo que manda el cliente: qué quiere y cómo paga. Los precios y el total no
 * vienen aquí; el servidor los calcula con el catálogo.
 */
export class CrearPedidoDto {
  @IsArray()
  @ArrayMinSize(1, { message: "El pedido debe tener al menos un producto" })
  @ArrayMaxSize(MAX_ITEMS_POR_PEDIDO)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items: ItemPedidoDto[];

  @IsEnum(MetodoPago, {
    message: "metodoPago debe ser efectivo o transferencia",
  })
  metodoPago: MetodoPago;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  nota?: string;
}
