import { MigrationInterface, QueryRunner } from "typeorm";

/** Cada producto define desde cuántas unidades se considera «stock bajo» (antes era 5 para todos). */
export class AddStockMinimoProductos1763630000000 implements MigrationInterface {
  name = "AddStockMinimoProductos1763630000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN "stock_minimo" integer NOT NULL DEFAULT 5`,
    );
    await queryRunner.query(`
      ALTER TABLE "productos"
        ADD CONSTRAINT "CHK_productos_stock_minimo"
        CHECK ("stock_minimo" >= 0 AND "stock_minimo" <= 1000000)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "productos" DROP CONSTRAINT "CHK_productos_stock_minimo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN "stock_minimo"`,
    );
  }
}
