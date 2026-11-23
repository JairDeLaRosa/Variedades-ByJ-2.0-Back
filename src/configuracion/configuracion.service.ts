import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ImagenDto } from "../common/dtos/imagen.dto";
import { FilesService } from "../files/files.service";
import { Configuracion, ID_CONFIGURACION } from "./configuracion.entity";
import { GuardarConfiguracionDto } from "./dtos/guardar-configuracion.dto";

/** Lo que devuelve la API; es público, así que no lleva nada interno (ni el publicId del logo). */
export const aRespuesta = (c: Configuracion) => ({
  nombre: c.nombre,
  eslogan: c.eslogan,
  descripcion: c.descripcion,
  nit: c.nit,
  direccion: c.direccion,
  telefono: c.telefono,
  correo: c.correo,
  horario: c.horario,
  facebook: c.facebook,
  instagram: c.instagram,
  whatsapp: c.whatsapp,
  cuentaTransferencia: c.cuentaTransferencia,
  logo: c.logoUrl ? { url: c.logoUrl } : null,
  updatedAt: c.updatedAt,
});

/** Un texto vacío o solo con espacios se guarda como «sin dato». */
const limpio = (texto?: string) => texto?.replace(/\r\n/g, "\n").trim() || null;

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion)
    private readonly configuracion: Repository<Configuracion>,
    private readonly files: FilesService,
  ) {}

  async obtener() {
    return aRespuesta(await this.buscar());
  }

  /**
   * Guarda los datos del negocio y, si llega, el logo nuevo. El logo anterior
   * se borra de Cloudinary solo después de guardar; si la base falla, se borra
   * el recién subido y todo queda como estaba.
   */
  async guardar(dto: GuardarConfiguracionDto, archivos: Express.Multer.File[]) {
    if (archivos.length > 1) {
      throw new BadRequestException("El logo es una sola imagen.");
    }
    this.files.validarLote(archivos, 0);

    const actual = await this.buscar();
    const anterior = actual.logoPublicId;
    let nuevo: ImagenDto | undefined;
    if (archivos.length === 1) {
      [nuevo] = await this.files.uploadAll(archivos);
    }

    actual.nombre = dto.nombre;
    actual.eslogan = limpio(dto.eslogan);
    actual.descripcion = limpio(dto.descripcion);
    actual.nit = limpio(dto.nit);
    actual.direccion = limpio(dto.direccion);
    actual.telefono = limpio(dto.telefono);
    actual.correo = limpio(dto.correo);
    actual.horario = limpio(dto.horario);
    actual.facebook = limpio(dto.facebook);
    actual.instagram = limpio(dto.instagram);
    actual.whatsapp = limpio(dto.whatsapp);
    actual.cuentaTransferencia = limpio(dto.cuentaTransferencia);

    const cambiaLogo = Boolean(nuevo) || Boolean(dto.quitarLogo);
    if (nuevo) {
      actual.logoPublicId = nuevo.publicId;
      actual.logoUrl = nuevo.url;
    } else if (dto.quitarLogo) {
      actual.logoPublicId = null;
      actual.logoUrl = null;
    }

    try {
      await this.configuracion.save(actual);
    } catch (error) {
      if (nuevo) await this.files.deleteFiles([nuevo.publicId]);
      throw error;
    }
    if (cambiaLogo && anterior) await this.files.deleteFiles([anterior]);

    return aRespuesta(actual);
  }

  private async buscar() {
    const fila = await this.configuracion.findOneBy({ id: ID_CONFIGURACION });
    if (!fila) {
      throw new NotFoundException("Falta la configuración del negocio.");
    }
    return fila;
  }
}
