import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { VentasService } from "./ventas.service";
import { CreateVentaDto } from "./dtos/create-venta.dto";

@Controller("api/ventas")
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
  getByMonth(@Query("date") date: string) {
    // date = "2025-12"
    const [yearStr, monthStr] = date.split("-");

    const year = Number(yearStr);
    const month = Number(monthStr);

    if (!year || !month || month < 1 || month > 12) {
      throw new HttpException(
        "Fecha inválida. Use formato YYYY-MM.",
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.ventasService.getByMonth(month, year);
  }
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.ventasService.findOne(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.ventasService.remove(id);
  }
}
