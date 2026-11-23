import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { Usuario } from "../auth/entities/usuario.entity";
import { CATALOGO_PERMISOS, Permiso } from "../auth/permisos";
import { exigirPermisosPropios, permisosDeRol } from "../auth/permisos-usuario";
import { GuardarRolDto } from "./dtos/guardar-rol.dto";
import { RolPermiso } from "./rol-permiso.entity";
import { ClaveRol, Rol } from "./rol.entity";

const PG_UNIQUE_VIOLATION = "23505";
const MENSAJE_NOMBRE_USADO = "Ya existe un rol con ese nombre.";

export interface RolDetalle {
  id: number;
  nombre: string;
  descripcion: string;
  clave: ClaveRol | null;
  permisos: Permiso[];
  /** Cuántos usuarios tienen este rol. */
  usuarios: number;
}

const aDetalle = (rol: Rol, usuarios: number): RolDetalle => ({
  id: rol.id,
  nombre: rol.nombre,
  descripcion: rol.descripcion,
  clave: rol.clave,
  permisos: permisosDeRol(rol),
  usuarios,
});

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol) private readonly roles: Repository<Rol>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {}

  /** Los permisos que existen, agrupados por módulo. */
  catalogo() {
    return CATALOGO_PERMISOS;
  }

  async listar(): Promise<RolDetalle[]> {
    const roles = await this.roles.find({
      relations: { permisos: true },
      order: { id: "ASC" },
    });
    const cuentas = await this.usuarios
      .createQueryBuilder("u")
      .select("u.rolId", "rolId")
      .addSelect("COUNT(*)", "total")
      .groupBy("u.rolId")
      .getRawMany<{ rolId: number; total: string }>();
    const porRol = new Map(
      cuentas.map((c) => [Number(c.rolId), Number(c.total)]),
    );

    return roles.map((rol) => aDetalle(rol, porRol.get(rol.id) ?? 0));
  }

  async crear(actor: AuthUser, dto: GuardarRolDto): Promise<RolDetalle> {
    exigirPermisosPropios(actor, dto.permisos);
    await this.verificarNombreLibre(dto.nombre);

    const rol = this.roles.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? "",
      clave: null,
      permisos: dto.permisos.map((permiso) =>
        Object.assign(new RolPermiso(), { permiso }),
      ),
    });
    return aDetalle(await this.guardar(rol), 0);
  }

  async actualizar(
    actor: AuthUser,
    id: number,
    dto: GuardarRolDto,
  ): Promise<RolDetalle> {
    const rol = await this.buscarEditable(id);

    // Quitar permisos siempre se puede; agregarlos, solo los que uno tiene.
    const actuales = new Map(rol.permisos.map((p) => [p.permiso, p]));
    exigirPermisosPropios(
      actor,
      dto.permisos.filter((p) => !actuales.has(p)),
    );
    await this.verificarNombreLibre(dto.nombre, id);

    rol.nombre = dto.nombre;
    rol.descripcion = dto.descripcion ?? "";
    // Los permisos que ya estaban conservan su fila; los quitados se borran.
    rol.permisos = dto.permisos.map(
      (permiso) =>
        actuales.get(permiso) ?? Object.assign(new RolPermiso(), { permiso }),
    );

    const guardado = await this.guardar(rol);
    return aDetalle(guardado, await this.usuarios.countBy({ rolId: id }));
  }

  async eliminar(id: number): Promise<void> {
    const rol = await this.buscarEditable(id);

    const enUso = await this.usuarios.countBy({ rolId: id });
    if (enUso > 0) {
      throw new ConflictException(
        `Tiene ${enUso} usuario(s). Cámbiales el rol antes de eliminarlo.`,
      );
    }
    await this.roles.remove(rol);
  }

  /** Busca un rol con sus permisos; los roles del sistema no se tocan. */
  private async buscarEditable(id: number): Promise<Rol> {
    const rol = await this.roles.findOne({
      where: { id },
      relations: { permisos: true },
    });
    if (!rol) {
      throw new NotFoundException("El rol no existe.");
    }
    if (rol.clave) {
      throw new BadRequestException(
        "Los roles del sistema no se pueden modificar.",
      );
    }
    return rol;
  }

  /** El nombre es único sin distinguir mayúsculas. */
  private async verificarNombreLibre(nombre: string, exceptoId?: number) {
    const consulta = this.roles
      .createQueryBuilder("r")
      .where("LOWER(r.nombre) = LOWER(:nombre)", { nombre });
    if (exceptoId) consulta.andWhere("r.id <> :exceptoId", { exceptoId });

    if (await consulta.getExists()) {
      throw new ConflictException(MENSAJE_NOMBRE_USADO);
    }
  }

  private async guardar(rol: Rol): Promise<Rol> {
    try {
      return await this.roles.save(rol);
    } catch (error) {
      // Dos peticiones a la vez con el mismo nombre: gana el índice único.
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(MENSAJE_NOMBRE_USADO);
      }
      throw error;
    }
  }
}
