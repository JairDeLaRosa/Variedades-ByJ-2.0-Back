import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { VentasService } from "./ventas.service";
import { CreateVentaDto } from "./dtos/create-venta.dto";
import { MonthQueryDto } from "../common/dtos/month-query.dto";
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";

@Controller("api/ventas")
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @Autorizar(Permiso.CierresRegistrar)
  create(@Body() createVentaDto: CreateVentaDto) {
    return this.ventasService.create(createVentaDto);
  }

  @Get()
  @Autorizar(Permiso.CierresVer)
  findAll() {
    return this.ventasService.findAll();
  }

  @Get("by-month")
  @Autorizar(Permiso.CierresVer)
  getByMonth(@Query() { date }: MonthQueryDto) {
    return this.ventasService.getByMonth(date);
  }

  @Get(":id")
  @Autorizar(Permiso.CierresVer)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Delete(":id")
  @Autorizar(Permiso.CierresEliminar)
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.ventasService.remove(id);
  }
}
