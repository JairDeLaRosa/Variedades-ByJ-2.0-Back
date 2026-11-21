import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

/**
 * Chequeo de salud para el hosting. No toca la base de datos a propósito:
 * si lo hiciera, cada chequeo despertaría a Neon y gastaría sus horas gratis.
 * Sin límite de peticiones: Render lo consulta de forma periódica.
 */
@SkipThrottle()
@Controller("api/health")
export class HealthController {
  @Get()
  comprobar() {
    return { status: "ok" };
  }
}
