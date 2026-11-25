import { Controller, Get, Query } from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { Autorizar } from "../auth/autorizar.decorator";
import { CurrentUser } from "../auth/decorators";
import { Permiso } from "../auth/permisos";
import { RangoQueryDto } from "./dtos/rango-query.dto";
import { ReportesService } from "./reportes.service";

@Controller("api/reportes")
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get("resumen")
  @Autorizar(Permiso.ReportesVer)
  resumen(@Query() rango: RangoQueryDto, @CurrentUser() actor: AuthUser) {
    return this.reportesService.resumen(rango, actor);
  }
}
