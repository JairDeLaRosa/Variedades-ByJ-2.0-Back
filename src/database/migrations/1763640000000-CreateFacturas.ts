import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Las salidas pasan a ser pagos y abonos de una factura (o pagos libres con
 * nota). Crea `facturas`, sus soportes y su calendario de cuotas, y convierte
 * cada salida existente en una factura libre ya pagada con esa salida.
 *
 * Quita `salidas.factura` y `salidas.tienda` en el mismo paso: el contrato de
 * la API cambia, así que no hay un estado intermedio compatible con el front
 * anterior. Si dos salidas repiten número de factura, el índice único falla y
 * la migración se detiene sin cambios.
 */
export class CreateFacturas1763640000000 implements MigrationInterface {
  name = "CreateFacturas1763640000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "facturas" (
        "id" SERIAL NOT NULL,
        "numero" text NOT NULL,
        "proveedor" text NOT NULL,
        "fecha" date NOT NULL,
        "total" integer NOT NULL,
        "modalidad" varchar(10) NOT NULL DEFAULT 'libre',
        "vence" date,
        "periodicidad" varchar(10),
        "interes_porcentaje" numeric(5,2) NOT NULL DEFAULT 0,
        "interes_monto" integer NOT NULL DEFAULT 0,
        "notas" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_facturas_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_facturas_total" CHECK ("total" >= 0),
        CONSTRAINT "CK_facturas_modalidad"
          CHECK ("modalidad" IN ('libre', 'plazo', 'cuotas')),
        CONSTRAINT "CK_facturas_periodicidad"
          CHECK ("periodicidad" IS NULL OR "periodicidad" IN ('semanal', 'quincenal', 'mensual')),
        CONSTRAINT "CK_facturas_interes_porcentaje"
          CHECK ("interes_porcentaje" BETWEEN 0 AND 100),
        CONSTRAINT "CK_facturas_interes_monto" CHECK ("interes_monto" >= 0),
        CONSTRAINT "CK_facturas_plazo_vence"
          CHECK ("modalidad" <> 'plazo' OR "vence" IS NOT NULL),
        CONSTRAINT "CK_facturas_cuotas_periodicidad"
          CHECK ("modalidad" <> 'cuotas' OR "periodicidad" IS NOT NULL)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_facturas_numero" ON "facturas" (lower("numero"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_facturas_fecha" ON "facturas" ("fecha")`,
    );

    await queryRunner.query(`
      CREATE TABLE "factura_imagenes" (
        "id" SERIAL NOT NULL,
        "factura_id" integer NOT NULL,
        "public_id" text NOT NULL,
        "url" text NOT NULL,
        CONSTRAINT "PK_factura_imagenes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_factura_imagenes_public_id" UNIQUE ("public_id"),
        CONSTRAINT "FK_factura_imagenes_factura" FOREIGN KEY ("factura_id")
          REFERENCES "facturas" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_factura_imagenes_factura" ON "factura_imagenes" ("factura_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "factura_cuotas" (
        "id" SERIAL NOT NULL,
        "factura_id" integer NOT NULL,
        "numero" integer NOT NULL,
        "vence" date NOT NULL,
        "monto" integer NOT NULL,
        CONSTRAINT "PK_factura_cuotas_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_factura_cuotas_numero" UNIQUE ("factura_id", "numero"),
        CONSTRAINT "CK_factura_cuotas_monto" CHECK ("monto" >= 0),
        CONSTRAINT "FK_factura_cuotas_factura" FOREIGN KEY ("factura_id")
          REFERENCES "facturas" ("id") ON DELETE CASCADE
      )
    `);

    // Cada salida de hoy pasa a ser una factura libre pagada por esa salida.
    await queryRunner.query(`
      INSERT INTO "facturas"
        ("numero", "proveedor", "fecha", "total", "modalidad", "created_at", "updated_at")
      SELECT btrim("factura"), btrim("tienda"), "fecha", "total", 'libre',
             "created_at", "updated_at"
      FROM "salidas"
    `);

    await queryRunner.query(`
      ALTER TABLE "salidas"
        ADD COLUMN "factura_id" integer,
        ADD COLUMN "nota" text
    `);
    await queryRunner.query(`
      UPDATE "salidas" s SET "factura_id" = f."id"
      FROM "facturas" f
      WHERE lower(f."numero") = lower(btrim(s."factura"))
    `);
    await queryRunner.query(`
      ALTER TABLE "salidas"
        ADD CONSTRAINT "FK_salidas_factura" FOREIGN KEY ("factura_id")
          REFERENCES "facturas" ("id") ON DELETE RESTRICT,
        ADD CONSTRAINT "CK_salidas_factura_o_nota"
          CHECK ("factura_id" IS NOT NULL OR btrim(coalesce("nota", '')) <> '')
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_salidas_factura" ON "salidas" ("factura_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP COLUMN "factura", DROP COLUMN "tienda"`,
    );
  }

  /**
   * Devuelve `factura` y `tienda` a cada salida desde su factura. Los pagos
   * libres (sin factura) quedan con 'S/N' y 'Sin proveedor', y se pierde el
   * detalle de facturas con varios abonos, de las cuotas, de los soportes de
   * factura y de las notas.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "salidas"
        ADD COLUMN "factura" text NOT NULL DEFAULT 'S/N',
        ADD COLUMN "tienda" text NOT NULL DEFAULT 'Sin proveedor'
    `);
    await queryRunner.query(`
      UPDATE "salidas" s SET "factura" = f."numero", "tienda" = f."proveedor"
      FROM "facturas" f
      WHERE s."factura_id" = f."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "salidas"
        ALTER COLUMN "factura" DROP DEFAULT,
        ALTER COLUMN "tienda" DROP DEFAULT
    `);
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP CONSTRAINT "CK_salidas_factura_o_nota"`,
    );
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP COLUMN "factura_id", DROP COLUMN "nota"`,
    );
    await queryRunner.query(`DROP TABLE "factura_cuotas"`);
    await queryRunner.query(`DROP TABLE "factura_imagenes"`);
    await queryRunner.query(`DROP TABLE "facturas"`);
  }
}
