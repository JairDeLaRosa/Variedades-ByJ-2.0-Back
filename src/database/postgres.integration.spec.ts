import { config as loadEnv } from "dotenv";
import { Test } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Client } from "pg";
import { envValidationSchema } from "../config/env.validation";
import { typeOrmConfig } from "./typeorm.config";
import dataSourceCli from "./data-source";

// Prueba contra una base PostgreSQL real (Neon). Se omite si no hay DATABASE_URL.
loadEnv({ path: [".env.local", ".env"] });
const describeConBase = process.env.DATABASE_URL ? describe : describe.skip;

describeConBase("PostgreSQL (integración)", () => {
  jest.setTimeout(30000);

  let moduleRef: Awaited<
    ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>
  >;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [".env.local", ".env"],
          validationSchema: envValidationSchema.fork(
            [
              "DB_CONECT",
              "SECRET_JWT_SEED",
              "CLOUDINARY_NAME",
              "CLOUDINARY_API_KEY",
              "CLOUDINARY_API_SECRET",
            ],
            (schema) => schema.optional(),
          ),
        }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: typeOrmConfig,
        }),
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it("conecta con la configuración de la app y responde una consulta", async () => {
    const [{ version }] = await dataSource.query("SELECT version()");

    expect(version).toMatch(/PostgreSQL/);
  });

  it("escribe y lee datos, y no deja nada guardado (rollback)", async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        "CREATE TABLE prueba_conexion (id serial PRIMARY KEY, nombre text NOT NULL)",
      );
      await queryRunner.query(
        "INSERT INTO prueba_conexion (nombre) VALUES ($1)",
        ["Variedades ByJ"],
      );

      const filas = await queryRunner.query(
        "SELECT nombre FROM prueba_conexion",
      );

      expect(filas).toEqual([{ nombre: "Variedades ByJ" }]);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }

    const [{ existe }] = await dataSource.query(
      "SELECT to_regclass('public.prueba_conexion') IS NOT NULL AS existe",
    );
    expect(existe).toBe(false);
  });

  it("conecta con la URL directa que usan las migraciones", async () => {
    const directa = new DataSource({
      ...dataSourceCli.options,
      entities: [],
      migrations: [],
    });

    await directa.initialize();
    try {
      const [{ resultado }] = await directa.query("SELECT 1 AS resultado");
      expect(resultado).toBe(1);
    } finally {
      await directa.destroy();
    }
  });

  it("rechaza las conexiones sin TLS (Neon exige conexión cifrada)", async () => {
    // pg_stat_ssl no sirve en Neon: su proxy termina el TLS. La prueba válida
    // es que una conexión sin TLS sea rechazada.
    const url = new URL(process.env.DATABASE_URL);
    const sinTls = new Client({
      host: url.hostname,
      port: Number(url.port) || 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      ssl: false,
    });

    await expect(sinTls.connect()).rejects.toThrow(/insecure|SSL|TLS/i);
    await sinTls.end().catch(() => undefined);
  });
});
