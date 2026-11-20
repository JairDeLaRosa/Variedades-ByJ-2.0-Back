import { Matches } from "class-validator";

const FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Query `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`, ambos días incluidos. */
export class RangoQueryDto {
  @Matches(FECHA, { message: "desde debe ser YYYY-MM-DD" })
  desde: string;

  @Matches(FECHA, { message: "hasta debe ser YYYY-MM-DD" })
  hasta: string;
}
