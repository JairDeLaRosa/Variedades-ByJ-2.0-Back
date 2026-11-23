import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { MAX_ITEMS_POR_PEDIDO, MetodoPago } from "../pedido.constantes";
import { ItemPedidoDto } from "./crear-pedido.dto";

const recortar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

/**
 * Venta que el vendedor registra en el mostrador: nace entregada. Solo
 * productos del catálogo; los precios los calcula el servidor.
 */
export class RegistrarVentaDto {
  @IsArray()
  @ArrayMinSize(1, { message: "La venta debe tener al menos un producto" })
  @ArrayMaxSize(MAX_ITEMS_POR_PEDIDO)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items: ItemPedidoDto[];

  @IsEnum(MetodoPago, {
    message: "metodoPago debe ser efectivo o transferencia",
  })
  metodoPago: MetodoPago;

  /** Nombre del cliente si lo dan; si no, queda «Cliente de mostrador». */
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(100)
  clienteNombre?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(30)
  clienteTelefono?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(300)
  nota?: string;
}
