import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { interceptorArchivos } from "../files/archivos";
import { ProductoService } from "./producto.service";
import { AjustarStockDto } from "./dtos/ajustar-stock.dto";
import { CreateProductoDto } from "./dtos/create-producto.dto";
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";

@Controller("api/productos")
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  // El catálogo es público: la tienda lo consulta sin sesión.
  @Get()
  findAll(@Query("categoria") categoria?: string) {
    return this.productoService.findAll(categoria);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productoService.findOne(id);
  }

  // multipart/form-data: campos del producto + fotos nuevas en `imagenes`.
  @Post()
  @Autorizar(Permiso.ProductosCrear)
  @UseInterceptors(interceptorArchivos())
  create(
    @Body() createProductoDto: CreateProductoDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.productoService.create(createProductoDto, archivos);
  }

  @Put(":id")
  @Autorizar(Permiso.ProductosEditar)
  @UseInterceptors(interceptorArchivos())
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateProductoDto: CreateProductoDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.productoService.update(id, updateProductoDto, archivos);
  }

  @Patch(":id/stock")
  @Autorizar(Permiso.InventarioAjustar)
  ajustarStock(
    @Param("id", ParseIntPipe) id: number,
    @Body() ajuste: AjustarStockDto,
  ) {
    return this.productoService.ajustarStock(id, ajuste);
  }

  @Delete(":id")
  @Autorizar(Permiso.ProductosEliminar)
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.productoService.remove(id);
  }
}
