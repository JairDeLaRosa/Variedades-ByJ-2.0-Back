import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Put,
  Query,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { SalidaService } from "./salida.service";
import { CreateSalidaDto } from "./dtos/create-salida.dto";

@Controller("api/salidas")
export class SalidaController {
  constructor(private readonly salidaService: SalidaService) {}

  @Post()
  create(@Body() createSalidaDto: CreateSalidaDto) {
    return this.salidaService.create(createSalidaDto);
  }

  @Get()
  findAll() {
    return this.salidaService.findAll();
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

    return this.salidaService.getByMonth(month, year);
  }
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.salidaService.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() updateSalidaDto: CreateSalidaDto) {
    return this.salidaService.update(id, updateSalidaDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.salidaService.remove(id);
  }
}
