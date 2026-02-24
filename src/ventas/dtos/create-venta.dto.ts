import { Venta } from "../ventas.schema";

export class CreateVentaDto {
  fecha: Date;
  total: number;
  totalPinateria: number;
  totalPapeleria: number;
  totalTransferencia: number
}

export interface ResponseCreateRPT {
  ok: boolean;
  msg: string;
  data: Venta;
}
