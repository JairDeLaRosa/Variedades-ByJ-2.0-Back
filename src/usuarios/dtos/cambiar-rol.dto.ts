import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class CambiarRolDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rolId: number;
}
