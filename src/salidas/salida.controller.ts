import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SalidaService } from "./salida.service";
import { CreateSalidaDto } from "./dtos/create-salida.dto";
import { MonthQueryDto } from "../common/dtos/month-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

@Controller("api/salidas")
@UseGuards(JwtAuthGuard, AdminGuard)
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
  getByMonth(@Query() { date }: MonthQueryDto) {
    return this.salidaService.getByMonth(date);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.salidaService.findOne(id);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateSalidaDto: CreateSalidaDto,
  ) {
    return this.salidaService.update(id, updateSalidaDto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.salidaService.remove(id);
  }
}
