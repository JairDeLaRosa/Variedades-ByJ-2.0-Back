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
  UseGuards,
} from "@nestjs/common";
import { ProductoService } from "./producto.service";
import { AjustarStockDto } from "./dtos/ajustar-stock.dto";
import { CreateProductoDto } from "./dtos/create-producto.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../auth/guards/admin.guard";

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

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.productoService.create(createProductoDto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateProductoDto: CreateProductoDto,
  ) {
    return this.productoService.update(id, updateProductoDto);
  }

  @Patch(":id/stock")
  @UseGuards(JwtAuthGuard, AdminGuard)
  ajustarStock(
    @Param("id", ParseIntPipe) id: number,
    @Body() ajuste: AjustarStockDto,
  ) {
    return this.productoService.ajustarStock(id, ajuste);
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.productoService.remove(id);
  }
}
