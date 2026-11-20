import { Controller, Get } from "@nestjs/common";

/**
 * Chequeo de salud para el hosting. No toca la base de datos a propósito:
 * si lo hiciera, cada chequeo despertaría a Neon y gastaría sus horas gratis.
 */
@Controller("api/health")
export class HealthController {
  @Get()
  comprobar() {
    return { status: "ok" };
  }
}
