import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from "class-validator";
import { PERIODICIDADES, type Periodicidad } from "../calculos";

/** Query de `GET api/facturas/simular-cuotas`: calcula el calendario sin guardar. */
export class SimularCuotasQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  total: number;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(60)
  numeroCuotas: number;

  @IsIn(PERIODICIDADES)
  periodicidad: Periodicidad;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "primeraCuota debe ser YYYY-MM-DD",
  })
  @IsISO8601(
    { strict: true },
    { message: "primeraCuota no es una fecha válida" },
  )
  primeraCuota: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  interesPorcentaje?: number;
}
