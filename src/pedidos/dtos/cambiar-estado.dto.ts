import { IsEnum } from "class-validator";
import { EstadoPedido } from "../pedido.constantes";

export class CambiarEstadoDto {
  @IsEnum(EstadoPedido, { message: "estado no es válido" })
  estado: EstadoPedido;
}
