import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RangoQueryDto } from "./dtos/rango-query.dto";
import { ReportesService } from "./reportes.service";

@Controller("api/reportes")
@UseGuards(JwtAuthGuard, AdminGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get("resumen")
  resumen(@Query() rango: RangoQueryDto) {
    return this.reportesService.resumen(rango);
  }
}
