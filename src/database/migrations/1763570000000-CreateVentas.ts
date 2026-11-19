import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVentas1763570000000 implements MigrationInterface {
  name = "CreateVentas1763570000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ventas" (
        "id" SERIAL NOT NULL,
        "fecha" date NOT NULL,
        "total" integer NOT NULL,
        "total_pinateria" integer NOT NULL,
        "total_papeleria" integer NOT NULL,
        "total_transferencias" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ventas_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ventas_fecha" UNIQUE ("fecha"),
        CONSTRAINT "CK_ventas_montos" CHECK (
          "total" >= 0 AND "total_pinateria" >= 0
          AND "total_papeleria" >= 0 AND "total_transferencias" >= 0
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ventas"`);
  }
}
