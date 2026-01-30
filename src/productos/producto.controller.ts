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
import { ProductoService } from "./producto.service";
import { CreateProductoDto } from "./dtos/create-producto.dto";

@Controller("api/productos")
export class ProductoController {
  constructor(private readonly salidaService: ProductoService) {}

  @Post()
  create(@Body() createProductoDto: CreateProductoDto) {
    return this.salidaService.create(createProductoDto);
  }

  // @Get()
  // findAll() {
  //   return this.salidaService.findAll();
  // }

  // @Get("by-month")
  // getByMonth(@Query("date") date: string) {
  //   // date = "2025-12"
  //   const [yearStr, monthStr] = date.split("-");

  //   const year = Number(yearStr);
  //   const month = Number(monthStr);

  //   if (!year || !month || month < 1 || month > 12) {
  //     throw new HttpException(
  //       "Fecha inválida. Use formato YYYY-MM.",
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   return this.salidaService.getByMonth(month, year);
  // }
  // @Get(":id")
  // findOne(@Param("id") id: string) {
  //   return this.salidaService.findOne(id);
  // }

  // @Put(":id")
  // update(@Param("id") id: string, @Body() updateSalidaDto: CreateSalidaDto) {
  //   return this.salidaService.update(id, updateSalidaDto);
  // }

  // @Delete(":id")
  // remove(@Param("id") id: string) {
  //   return this.salidaService.remove(id);
  // }
}
