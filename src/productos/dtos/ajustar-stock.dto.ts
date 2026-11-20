import { IsEnum, IsInt, Max, Min } from "class-validator";

/** Stock máximo de un producto; el mismo tope que al crearlo. */
export const STOCK_MAXIMO = 1_000_000;

export enum ModoAjuste {
  /** Suma `cantidad` al stock actual (entrada de mercancía). */
  Sumar = "sumar",
  /** Resta `cantidad` al stock actual (salida o pérdida). */
  Restar = "restar",
  /** Deja el stock exactamente en `cantidad` (conteo físico). */
  Fijar = "fijar",
}

export class AjustarStockDto {
  @IsEnum(ModoAjuste)
  modo: ModoAjuste;

  @IsInt()
  @Min(0)
  @Max(STOCK_MAXIMO)
  cantidad: number;
}
