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
  UseInterceptors,
} from "@nestjs/common";
import { interceptorArchivos } from "../files/archivos";
import { SalidaService } from "./salida.service";
import { CreateSalidaDto } from "./dtos/create-salida.dto";
import { MonthQueryDto } from "../common/dtos/month-query.dto";
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";

@Controller("api/salidas")
export class SalidaController {
  constructor(private readonly salidaService: SalidaService) {}

  // multipart/form-data: campos de la salida + soportes nuevos en `imagenes`.
  @Post()
  @Autorizar(Permiso.SalidasRegistrar)
  @UseInterceptors(interceptorArchivos())
  create(
    @Body() createSalidaDto: CreateSalidaDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.salidaService.create(createSalidaDto, archivos);
  }

  @Get()
  @Autorizar(Permiso.SalidasVer)
  findAll() {
    return this.salidaService.findAll();
  }

  @Get("by-month")
  @Autorizar(Permiso.SalidasVer)
  getByMonth(@Query() { date }: MonthQueryDto) {
    return this.salidaService.getByMonth(date);
  }

  @Get(":id")
  @Autorizar(Permiso.SalidasVer)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.salidaService.findOne(id);
  }

  @Put(":id")
  @Autorizar(Permiso.SalidasEditar)
  @UseInterceptors(interceptorArchivos())
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateSalidaDto: CreateSalidaDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.salidaService.update(id, updateSalidaDto, archivos);
  }

  @Delete(":id")
  @Autorizar(Permiso.SalidasEliminar)
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.salidaService.remove(id);
  }
}
