import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { Rol } from "../roles/rol.entity";
import { Usuario } from "./entities/usuario.entity";
import { CreateUserDto } from "./dtos/create-user.dto";
import { LoginDto } from "./dtos/login.dto";
import { AuthUser } from "./auth-user.interface";
import { construirAuthUser } from "./permisos-usuario";

const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Rol) private readonly roles: Repository<Rol>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();

    if (await this.usuarios.existsBy({ email })) {
      throw new ConflictException("Un usuario ya existe con ese email.");
    }

    // Quien se registra es siempre cliente; el rol nunca viene del navegador.
    const cliente = await this.roles.findOneBy({ clave: "cliente" });
    if (!cliente) {
      throw new InternalServerErrorException("Falta el rol de cliente.");
    }

    const usuario = this.usuarios.create({
      name: createUserDto.name,
      phone: createUserDto.phone,
      email,
      password: await bcrypt.hash(createUserDto.password, 10),
      rolId: cliente.id,
    });

    try {
      await this.usuarios.save(usuario);
    } catch (error) {
      // Dos registros simultáneos con el mismo email: gana el índice único.
      if (error?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException("Un usuario ya existe con ese email.");
      }
      throw error;
    }

    return {
      ok: true,
      id: usuario.id,
      name: usuario.name,
      token: this.generarJwt(usuario, false),
    };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();

    const credenciales = await this.usuarios.findOne({
      where: { email },
      select: { id: true, password: true },
    });

    // Mismo mensaje para email inexistente y contraseña errónea: no revela
    // qué emails están registrados.
    const valido =
      credenciales &&
      (await bcrypt.compare(loginDto.password, credenciales.password));
    if (!valido) {
      throw new UnauthorizedException("Credenciales inválidas.");
    }

    const usuario = await this.cargarUsuario(credenciales.id);
    if (!usuario) {
      throw new UnauthorizedException("Credenciales inválidas.");
    }

    return {
      ok: true,
      msg: "Login exitoso!",
      user: this.datosDeUsuario(usuario),
      token: this.generarJwt(usuario, usuario.rol.clave === "admin"),
    };
  }

  /** Token nuevo y los datos vigentes del usuario (su rol y permisos pueden haber cambiado). */
  async renewToken(authUser: AuthUser) {
    const usuario = await this.cargarUsuario(authUser.uid);
    if (!usuario) {
      throw new UnauthorizedException("El usuario ya no existe.");
    }

    return {
      ok: true,
      token: this.generarJwt(usuario, usuario.rol.clave === "admin"),
      user: this.datosDeUsuario(usuario),
    };
  }

  private cargarUsuario(id: number) {
    return this.usuarios.findOne({
      where: { id },
      relations: { rol: { permisos: true } },
    });
  }

  /** Lo que la web necesita saber: quién es y qué puede hacer. */
  private datosDeUsuario(usuario: Usuario) {
    const { esAdmin, permisos } = construirAuthUser(usuario);
    return {
      id: usuario.id,
      name: usuario.name,
      phone: usuario.phone,
      email: usuario.email,
      rol: {
        id: usuario.rol.id,
        nombre: usuario.rol.nombre,
        clave: usuario.rol.clave,
      },
      permisos,
      // Obsoleto: lo siguen leyendo versiones anteriores de la web.
      admin: esAdmin,
    };
  }

  /**
   * El token solo sirve para identificar al usuario: los permisos se leen de
   * la base de datos en cada petición (ver JwtStrategy). `admin` es obsoleto.
   */
  private generarJwt(usuario: Pick<Usuario, "id" | "name">, admin: boolean) {
    return this.jwtService.sign({
      uid: usuario.id,
      name: usuario.name,
      admin,
    });
  }
}
