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
} from "@nestjs/common";
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";
import { CreateProveedorDto } from "./dtos/create-proveedor.dto";
import { ProveedoresQueryDto } from "./dtos/proveedores-query.dto";
import { ProveedorService } from "./proveedor.service";

@Controller("api/proveedores")
export class ProveedorController {
  constructor(private readonly proveedorService: ProveedorService) {}

  @Post()
  @Autorizar(Permiso.ProveedoresCrear)
  create(@Body() dto: CreateProveedorDto) {
    return this.proveedorService.create(dto);
  }

  @Get()
  @Autorizar(Permiso.ProveedoresVer)
  findAll(@Query() filtros: ProveedoresQueryDto) {
    return this.proveedorService.findAll(filtros);
  }

  @Get(":id")
  @Autorizar(Permiso.ProveedoresVer)
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.proveedorService.findOne(id);
  }

  @Put(":id")
  @Autorizar(Permiso.ProveedoresEditar)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateProveedorDto,
  ) {
    return this.proveedorService.update(id, dto);
  }

  @Delete(":id")
  @Autorizar(Permiso.ProveedoresEliminar)
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.proveedorService.remove(id);
  }
}
