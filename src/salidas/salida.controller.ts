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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { interceptorArchivos } from "../files/archivos";
import { SalidaService } from "./salida.service";
import { CreateSalidaDto } from "./dtos/create-salida.dto";
import { MonthQueryDto } from "../common/dtos/month-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

@Controller("api/salidas")
@UseGuards(JwtAuthGuard, AdminGuard)
export class SalidaController {
  constructor(private readonly salidaService: SalidaService) {}

  // multipart/form-data: campos de la salida + soportes nuevos en `imagenes`.
  @Post()
  @UseInterceptors(interceptorArchivos())
  create(
    @Body() createSalidaDto: CreateSalidaDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.salidaService.create(createSalidaDto, archivos);
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
  @UseInterceptors(interceptorArchivos())
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateSalidaDto: CreateSalidaDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.salidaService.update(id, updateSalidaDto, archivos);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.salidaService.remove(id);
  }
}
