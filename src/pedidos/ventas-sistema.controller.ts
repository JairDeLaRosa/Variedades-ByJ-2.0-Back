import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";
import { ListarVentasQueryDto } from "./dtos/listar-ventas-query.dto";
import { RegistrarVentaDto } from "./dtos/registrar-venta.dto";
import { PedidosService } from "./pedidos.service";

/** Ventas hechas por el sistema: pedidos entregados y ventas de mostrador (distintas del cierre diario en `api/ventas`). */
@Controller("api/ventas-sistema")
export class VentasSistemaController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @Autorizar(Permiso.VentasVer)
  listar(@Query() consulta: ListarVentasQueryDto) {
    return this.pedidosService.listarVentas(consulta);
  }

  @Post()
  @Autorizar(Permiso.VentasRegistrar)
  registrar(@Body() dto: RegistrarVentaDto) {
    return this.pedidosService.registrarVenta(dto);
  }

  @Get(":id")
  @Autorizar(Permiso.VentasComprobante)
  obtener(@Param("id", ParseIntPipe) id: number) {
    return this.pedidosService.obtenerVenta(id);
  }
}
