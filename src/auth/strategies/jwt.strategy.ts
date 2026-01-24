import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader("x-token"),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("SECRET_JWT_SEED"),
    });
  }

  async validate(payload: any) {
    return { uid: payload.uid, name: payload.name };
  }
}
