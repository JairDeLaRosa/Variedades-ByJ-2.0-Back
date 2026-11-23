import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { AuthUser } from "../auth-user.interface";
import { Usuario } from "../entities/usuario.entity";
import { construirAuthUser } from "../permisos-usuario";

interface JwtPayload {
  uid: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
  ) {
    super({
      // El frontend envía `Authorization: Bearer <token>`.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("SECRET_JWT_SEED"),
    });
  }

  /**
   * El token solo identifica al usuario: el nombre, el rol y los permisos se
   * leen de la base de datos, así un cambio de rol, o borrar al usuario, vale
   * de inmediato.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const usuario = await this.usuarios.findOne({
      where: { id: payload.uid },
      relations: { rol: { permisos: true } },
    });
    if (!usuario) {
      throw new UnauthorizedException("La sesión ya no es válida.");
    }
    return construirAuthUser(usuario);
  }
}
