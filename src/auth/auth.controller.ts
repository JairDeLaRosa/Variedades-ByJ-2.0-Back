import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import { LoginDto } from "./dtos/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators";
import { AuthUser } from "./auth-user.interface";
import { LIMITE_AUTENTICACION } from "../common/seguridad";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @Throttle({ default: LIMITE_AUTENTICACION })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("new")
  @Throttle({ default: LIMITE_AUTENTICACION })
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Get("renew")
  @UseGuards(JwtAuthGuard)
  renewToken(@CurrentUser() user: AuthUser) {
    return this.authService.renewToken(user);
  }
}
