import {
  Body,
  Controller,
  Get,
  Put,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { Autorizar } from "../auth/autorizar.decorator";
import { Permiso } from "../auth/permisos";
import { interceptorLogo } from "../files/archivos";
import { ConfiguracionService } from "./configuracion.service";
import { GuardarConfiguracionDto } from "./dtos/guardar-configuracion.dto";

@Controller("api/configuracion")
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  // Es público: la tienda lo lee sin sesión para el pie de página, el logo y
  // los datos de transferencia.
  @Get()
  obtener() {
    return this.configuracionService.obtener();
  }

  // multipart/form-data: los datos del negocio + el logo nuevo en `logo`.
  @Put()
  @Autorizar(Permiso.ConfiguracionEditar)
  @UseInterceptors(interceptorLogo())
  guardar(
    @Body() dto: GuardarConfiguracionDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.configuracionService.guardar(dto, archivos ?? []);
  }
}
