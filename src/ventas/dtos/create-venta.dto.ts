import { IsInt, IsISO8601, Matches, Max, Min } from "class-validator";
import { Venta } from "../ventas.entity";

const MAX_MONTO = 2_000_000_000;

export class CreateVentaDto {
  /** Día de negocio, `YYYY-MM-DD`. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "fecha debe ser YYYY-MM-DD" })
  @IsISO8601({ strict: true }, { message: "fecha no es una fecha válida" })
  fecha: string;

  @IsInt()
  @Min(0)
  @Max(MAX_MONTO)
  totalPinateria: number;

  @IsInt()
  @Min(0)
  @Max(MAX_MONTO)
  totalPapeleria: number;

  @IsInt()
  @Min(0)
  @Max(MAX_MONTO)
  totalTransferencias: number;
}

export class VentasByMonthQueryDto {
  /** Mes en formato `YYYY-MM`. */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "date debe ser YYYY-MM" })
  date: string;
}

export interface ResponseCreateRPT {
  ok: boolean;
  msg: string;
  data: Venta;
}
