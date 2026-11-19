import { Matches } from "class-validator";

/** Query `?date=YYYY-MM` de los endpoints `by-month`. */
export class MonthQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "date debe ser YYYY-MM" })
  date: string;
}
