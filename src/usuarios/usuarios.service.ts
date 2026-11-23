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
import { exigirPermisosPropios, permisosDeRol } from "../auth/permisos-usuario";
import { Rol } from "../roles/rol.entity";
import { ListarUsuariosQueryDto } from "./dtos/listar-usuarios-query.dto";

const LIMITE_POR_DEFECTO = 20;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Rol) private readonly roles: Repository<Rol>,
  ) {}

  /** Lista usuarios con su rol, de los más nuevos a los más antiguos. Nunca trae la contraseña. */
  async listar({ q, rolId, pagina = 1, limite }: ListarUsuariosQueryDto) {
    const porPagina = limite ?? LIMITE_POR_DEFECTO;
    const consulta = this.usuarios
      .createQueryBuilder("u")
      .leftJoin("u.rol", "r")
      .addSelect(["r.id", "r.nombre", "r.clave"])
      .orderBy("u.createdAt", "DESC")
      .addOrderBy("u.id", "DESC")
      .skip((pagina - 1) * porPagina)
      .take(porPagina);

    if (q) {
      consulta.andWhere("(u.name ILIKE :q OR u.email ILIKE :q)", {
        q: `%${q.replace(/[\\%_]/g, "\\$&")}%`,
      });
    }
    if (rolId) consulta.andWhere("u.rolId = :rolId", { rolId });

    const [datos, total] = await consulta.getManyAndCount();
    return { datos, total, pagina, limite: porPagina };
  }

  /**
   * Cambia el rol de un usuario. Reglas: nadie cambia su propio rol, no se
   * puede dar un rol con permisos que uno no tiene ni tocar a alguien que
   * tiene más permisos que uno, y siempre debe quedar un administrador.
   */
  async cambiarRol(
    actor: AuthUser,
    id: number,
    rolId: number,
  ): Promise<Usuario> {
    if (actor.uid === id) {
      throw new BadRequestException("No puedes cambiar tu propio rol.");
    }

    const usuario = await this.usuarios.findOne({
      where: { id },
      relations: { rol: { permisos: true } },
    });
    if (!usuario) {
      throw new NotFoundException("El usuario no existe.");
    }
    const nuevo = await this.roles.findOne({
      where: { id: rolId },
      relations: { permisos: true },
    });
    if (!nuevo) {
      throw new NotFoundException("El rol no existe.");
    }
    if (usuario.rolId === nuevo.id) return usuario;

    exigirPermisosPropios(
      actor,
      permisosDeRol(usuario.rol),
      "No puedes cambiar el rol de alguien con permisos que tú no tienes",
    );
    exigirPermisosPropios(actor, permisosDeRol(nuevo));

    if (usuario.rol.clave === "admin" && nuevo.clave !== "admin") {
      const administradores = await this.usuarios.count({
        where: { rol: { clave: "admin" } },
      });
      if (administradores <= 1) {
        throw new ConflictException("Debe quedar al menos un administrador.");
      }
    }

    usuario.rol = nuevo;
    usuario.rolId = nuevo.id;
    await this.usuarios.save(usuario);
    return usuario;
  }
}
