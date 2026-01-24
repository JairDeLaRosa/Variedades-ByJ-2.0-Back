import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import { LoginDto } from "./dtos/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("new")
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Get("renew")
  @UseGuards(JwtAuthGuard)
  renewToken(@Body() user: any) {
    return this.authService.renewToken(user);
  }
}
