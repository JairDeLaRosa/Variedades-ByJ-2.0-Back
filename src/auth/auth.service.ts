import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { Usuario } from "./entities/usuario.entity";
import { CreateUserDto } from "./dtos/create-user.dto";
import { LoginDto } from "./dtos/login.dto";
import { AuthUser } from "./auth-user.interface";

const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();

    if (await this.usuarios.existsBy({ email })) {
      throw new ConflictException("Un usuario ya existe con ese email.");
    }

    const usuario = this.usuarios.create({
      name: createUserDto.name,
      phone: createUserDto.phone,
      email,
      password: await bcrypt.hash(createUserDto.password, 10),
      admin: false,
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
      token: this.generarJwt(usuario),
    };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();

    const usuario = await this.usuarios.findOne({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        admin: true,
        password: true,
      },
    });

    // Mismo mensaje para email inexistente y contraseña errónea: no revela
    // qué emails están registrados.
    const valido =
      usuario && (await bcrypt.compare(loginDto.password, usuario.password));
    if (!valido) {
      throw new UnauthorizedException("Credenciales inválidas.");
    }

    return {
      ok: true,
      msg: "Login exitoso!",
      user: {
        name: usuario.name,
        phone: usuario.phone,
        email: usuario.email,
        admin: usuario.admin,
      },
      token: this.generarJwt(usuario),
    };
  }

  async renewToken(authUser: AuthUser) {
    const usuario = await this.usuarios.findOneBy({ id: authUser.uid });
    if (!usuario) {
      throw new UnauthorizedException("El usuario ya no existe.");
    }

    return { ok: true, token: this.generarJwt(usuario) };
  }

  private generarJwt(usuario: Pick<Usuario, "id" | "name" | "admin">) {
    return this.jwtService.sign({
      uid: usuario.id,
      name: usuario.name,
      admin: usuario.admin,
    });
  }
}
