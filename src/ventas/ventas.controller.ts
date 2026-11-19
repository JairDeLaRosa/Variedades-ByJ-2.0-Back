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
  UseGuards,
} from "@nestjs/common";
import { VentasService } from "./ventas.service";
import { CreateVentaDto } from "./dtos/create-venta.dto";
import { MonthQueryDto } from "../common/dtos/month-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

@Controller("api/ventas")
@UseGuards(JwtAuthGuard, AdminGuard)
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  create(@Body() createVentaDto: CreateVentaDto) {
    return this.ventasService.create(createVentaDto);
  }

  @Get()
  findAll() {
    return this.ventasService.findAll();
  }

  @Get("by-month")
  getByMonth(@Query() { date }: MonthQueryDto) {
    return this.ventasService.getByMonth(date);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.ventasService.remove(id);
  }
}
