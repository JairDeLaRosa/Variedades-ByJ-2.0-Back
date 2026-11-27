import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * El número de factura pasa a ser opcional: algunas facturas vienen sin él.
 * El índice único `UQ_facturas_numero` (sobre `lower(numero)`) se queda: en
 * Postgres los `NULL` no chocan entre sí, así que pueden existir varias sin número.
 *
 * Las facturas que hoy llevan un texto de relleno («SIN NÚMERO», sin importar
 * mayúsculas ni lo que lo rodee) pasan a `NULL`. Repetirla no cambia nada.
 */
export class FacturaNumeroOpcional1763670000000 implements MigrationInterface {
  name = "FacturaNumeroOpcional1763670000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "facturas" ALTER COLUMN "numero" DROP NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "facturas" SET "numero" = NULL WHERE "numero" ILIKE '%SIN NÚMERO%'`,
    );
  }

  /**
   * Las facturas sin número reciben `S/N-<id>` (único) para poder volver a
   * exigirlo; el texto de relleno original no se recupera.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "facturas" SET "numero" = 'S/N-' || "id" WHERE "numero" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "facturas" ALTER COLUMN "numero" SET NOT NULL`,
    );
  }
}
