import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthUser } from "../auth-user.interface";

interface JwtPayload {
  uid: number;
  name: string;
  admin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // El frontend envía `Authorization: Bearer <token>`.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("SECRET_JWT_SEED"),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      uid: payload.uid,
      name: payload.name,
      admin: payload.admin === true,
    };
  }
}
