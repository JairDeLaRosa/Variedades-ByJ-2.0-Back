import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { Autorizar } from "../auth/autorizar.decorator";
import { CurrentUser } from "../auth/decorators";
import { Permiso } from "../auth/permisos";
import { interceptorArchivos } from "../files/archivos";
import { CambiarEstadoDto } from "./dtos/cambiar-estado.dto";
import { CrearPedidoDto } from "./dtos/crear-pedido.dto";
import { ListarPedidosQueryDto } from "./dtos/listar-pedidos-query.dto";
import { PedidosService } from "./pedidos.service";

@Controller("api/pedidos")
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // --- Cualquier persona con sesión, sobre sus propios pedidos -------------

  @Post()
  @Autorizar()
  crear(@CurrentUser() actor: AuthUser, @Body() dto: CrearPedidoDto) {
    return this.pedidosService.crear(actor, dto);
  }

  @Get("mios")
  @Autorizar()
  listarMios(@CurrentUser() actor: AuthUser) {
    return this.pedidosService.listarMios(actor);
  }

  @Get("mios/:id")
  @Autorizar()
  obtenerMio(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.pedidosService.obtenerMio(actor, id);
  }

  @Patch("mios/:id/cancelar")
  @Autorizar()
  cancelarMio(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.pedidosService.cancelarMio(actor, id);
  }

  // multipart/form-data: el comprobante de la transferencia va en `comprobante`.
  @Post("mios/:id/comprobante")
  @Autorizar()
  @UseInterceptors(interceptorArchivos("comprobante"))
  subirComprobante(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseIntPipe) id: number,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.pedidosService.subirComprobante(actor, id, archivos ?? []);
  }

  // --- Personal de la tienda -------------------------------------------------

  @Get()
  @Autorizar(Permiso.PedidosVer)
  listar(@Query() consulta: ListarPedidosQueryDto) {
    return this.pedidosService.listar(consulta);
  }

  @Get(":id")
  @Autorizar(Permiso.PedidosVer)
  obtener(@Param("id", ParseIntPipe) id: number) {
    return this.pedidosService.obtener(id);
  }

  @Patch(":id/estado")
  @Autorizar(Permiso.PedidosGestionar)
  cambiarEstado(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.pedidosService.cambiarEstado(id, dto);
  }
}
