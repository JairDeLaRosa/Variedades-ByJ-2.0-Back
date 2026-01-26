import { Venta } from "../ventas.schema";

export class CreateVentaDto {
  fecha: Date;
  total: number;
  pedidos: number;
  ticketPromedio: number;
}

export interface ResponseCreateRPT {
  ok: boolean;
  msg: string;
  data: Venta;
}
