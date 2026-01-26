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
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new HttpException(
        "Fecha inválida. Use formato YYYY-MM-DD.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const month = dateObj.getMonth() + 2;
    const year = dateObj.getFullYear();
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
