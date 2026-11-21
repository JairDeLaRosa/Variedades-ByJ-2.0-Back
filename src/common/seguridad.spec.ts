import type { INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import * as request from "supertest";
import { AuthController } from "../auth/auth.controller";
import { AuthService } from "../auth/auth.service";
import { HealthController } from "../health/health.controller";
import {
  configurarSeguridad,
  LIMITE_AUTENTICACION,
  LIMITE_GENERAL,
  OPCIONES_LIMITE,
} from "./seguridad";

describe("Seguridad de la API pública", () => {
  const auth = {
    login: jest.fn().mockResolvedValue({ ok: true }),
    create: jest.fn().mockResolvedValue({ ok: true }),
  };
  let app: INestApplication;

  const levantar = async (proxysDeConfianza: number) => {
    const modulo = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(OPCIONES_LIMITE)],
      controllers: [AuthController, HealthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();
    const nueva = modulo.createNestApplication<NestExpressApplication>();
    configurarSeguridad(nueva, { proxysDeConfianza, swaggerActivo: false });
    await nueva.init();
    return nueva;
  };

  const login = (ip: string) =>
    request(app.getHttpServer())
      .post("/api/auth")
      .set("X-Forwarded-For", ip)
      .send({ email: "a@b.co", password: "123456" });

  afterEach(() => app.close());

  describe("con un proxy de confianza (como en Render)", () => {
    beforeEach(async () => {
      app = await levantar(1);
    });

    it("bloquea el login con 429 tras el límite de intentos", async () => {
      for (let i = 0; i < LIMITE_AUTENTICACION.limit; i++) {
        expect((await login("1.1.1.1")).status).toBe(201);
      }

      const bloqueado = await login("1.1.1.1");

      expect(bloqueado.status).toBe(429);
      expect(bloqueado.body.message).toMatch(/Demasiados intentos/);
    });

    it("cuenta por IP real: otra IP sigue pudiendo entrar", async () => {
      for (let i = 0; i <= LIMITE_AUTENTICACION.limit; i++) {
        await login("1.1.1.1");
      }

      expect((await login("2.2.2.2")).status).toBe(201);
    });

    it("limita el registro por separado del login", async () => {
      for (let i = 0; i < LIMITE_AUTENTICACION.limit; i++) {
        await login("3.3.3.3");
      }
      const registro = await request(app.getHttpServer())
        .post("/api/auth/new")
        .set("X-Forwarded-For", "3.3.3.3")
        .send({});

      expect(registro.status).not.toBe(429);
    });

    it("no limita el chequeo de salud", async () => {
      for (let i = 0; i < LIMITE_GENERAL.limit + 20; i++) {
        const res = await request(app.getHttpServer()).get("/api/health");
        expect(res.status).toBe(200);
      }
    });

    it("manda las cabeceras de seguridad y oculta Express", async () => {
      const res = await request(app.getHttpServer()).get("/api/health");

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["strict-transport-security"]).toBeDefined();
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("sin proxy de confianza", () => {
    beforeEach(async () => {
      app = await levantar(0);
    });

    it("ignora X-Forwarded-For: no se puede esquivar el límite cambiándolo", async () => {
      for (let i = 0; i < LIMITE_AUTENTICACION.limit; i++) {
        await login(`10.0.0.${i}`);
      }

      expect((await login("10.0.0.99")).status).toBe(429);
    });
  });
});
