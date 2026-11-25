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
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";
import { interceptorArchivos } from "../files/archivos";
import { CreateFacturaDto } from "./dtos/create-factura.dto";
import { FacturasQueryDto } from "./dtos/facturas-query.dto";
import { SimularCuotasQueryDto } from "./dtos/simular-cuotas-query.dto";
import { FacturaService } from "./factura.service";

@Controller("api/facturas")
export class FacturaController {
  constructor(private readonly facturaService: FacturaService) {}

  // multipart/form-data: campos de la factura + soportes nuevos en `imagenes`.
  @Post()
  @Autorizar(Permiso.FacturasRegistrar)
  @UseInterceptors(interceptorArchivos())
  create(
    @Body() createFacturaDto: CreateFacturaDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.facturaService.create(createFacturaDto, archivos);
  }

  @Get()
  @Autorizar(Permiso.FacturasVer)
  findAll(@Query() filtros: FacturasQueryDto) {
    return this.facturaService.findAll(filtros);
  }

  @Get("resumen")
  @Autorizar(Permiso.FacturasVer)
  resumen() {
    return this.facturaService.resumen();
  }

  @Get("simular-cuotas")
  @Autorizar(Permiso.FacturasRegistrar)
  simular(@Query() query: SimularCuotasQueryDto) {
    return this.facturaService.simular(query);
  }

  @Get(":id")
  @Autorizar(Permiso.FacturasVer)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.facturaService.findOne(id);
  }

  @Put(":id")
  @Autorizar(Permiso.FacturasEditar)
  @UseInterceptors(interceptorArchivos())
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateFacturaDto: CreateFacturaDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.facturaService.update(id, updateFacturaDto, archivos);
  }

  @Delete(":id")
  @Autorizar(Permiso.FacturasEliminar)
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.facturaService.remove(id);
  }
}
