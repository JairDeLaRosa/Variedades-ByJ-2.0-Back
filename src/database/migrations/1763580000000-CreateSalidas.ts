import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSalidas1763580000000 implements MigrationInterface {
  name = "CreateSalidas1763580000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "salidas" (
        "id" SERIAL NOT NULL,
        "fecha" date NOT NULL,
        "total" integer NOT NULL,
        "factura" text NOT NULL,
        "tienda" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_salidas_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_salidas_total" CHECK ("total" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_salidas_fecha" ON "salidas" ("fecha")`,
    );
    await queryRunner.query(`
      CREATE TABLE "salida_imagenes" (
        "id" SERIAL NOT NULL,
        "salida_id" integer NOT NULL,
        "public_id" text NOT NULL,
        "url" text NOT NULL,
        CONSTRAINT "PK_salida_imagenes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_salida_imagenes_public_id" UNIQUE ("public_id"),
        CONSTRAINT "FK_salida_imagenes_salida" FOREIGN KEY ("salida_id")
          REFERENCES "salidas" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_salida_imagenes_salida" ON "salida_imagenes" ("salida_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "salida_imagenes"`);
    await queryRunner.query(`DROP TABLE "salidas"`);
  }
}
