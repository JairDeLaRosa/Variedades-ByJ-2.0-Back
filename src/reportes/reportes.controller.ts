import { Controller, Get, Query } from "@nestjs/common";
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";
import { RangoQueryDto } from "./dtos/rango-query.dto";
import { ReportesService } from "./reportes.service";

@Controller("api/reportes")
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get("resumen")
  @Autorizar(Permiso.ReportesVer)
  resumen(@Query() rango: RangoQueryDto) {
    return this.reportesService.resumen(rango);
  }
}
