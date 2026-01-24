import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Usuario, UsuarioDocument } from "./entities/usuario.entity";
import { CreateUserDto } from "./dtos/create-user.dto";
import { LoginDto } from "./dtos/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    private jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;

    let usuario = await this.usuarioModel.findOne({ email });
    if (usuario) {
      throw new BadRequestException("Un usuario ya existe con ese email.");
    }

    usuario = new this.usuarioModel(createUserDto);
    const salt = bcrypt.genSaltSync();
    usuario.password = bcrypt.hashSync(password, salt);
    usuario.admin = false;

    await usuario.save();

    const token = this.generarJwt(usuario._id.toString(), usuario.name);

    return {
      ok: true,
      uid: usuario._id,
      name: usuario.name,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const usuario = await this.usuarioModel.findOne({ email });
    if (!usuario) {
      throw new UnauthorizedException("No existe usuario con ese email.");
    }

    const validPassword = bcrypt.compareSync(password, usuario.password);
    if (!validPassword) {
      throw new UnauthorizedException("Contraseña incorrecta.");
    }

    const token = this.generarJwt(usuario._id.toString(), usuario.name);

    return {
      ok: true,
      msg: "Login exitoso!",
      uid: usuario._id,
      name: usuario.name,
      admin: usuario.admin,
      token,
    };
  }

  async renewToken(user: any) {
    const token = this.generarJwt(user.uid, user.name);
    return {
      ok: true,
      token,
    };
  }

  private generarJwt(uid: string, name: string) {
    return this.jwtService.sign({ uid, name });
  }
}
