import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * El cierre diario deja de registrar transferencias: se elimina la columna
 * `total_transferencias` y el CHECK de montos queda solo con las demás.
 * Idempotente: corre igual si la columna ya no existe. Se niega a borrar la
 * columna si algún cierre tiene un monto, para no perder datos en silencio.
 */
export class DropTotalTransferenciasVentas1763650000000 implements MigrationInterface {
  name = "DropTotalTransferenciasVentas1763650000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'ventas' AND column_name = 'total_transferencias'
        ) THEN
          -- Anidado: la consulta solo se planifica si la columna existe.
          IF EXISTS (SELECT 1 FROM "ventas" WHERE "total_transferencias" <> 0) THEN
            RAISE EXCEPTION
              'ventas.total_transferencias tiene montos; revisalos antes de borrar la columna';
          END IF;
        END IF;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "ventas" DROP CONSTRAINT IF EXISTS "CK_ventas_montos"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ventas" DROP COLUMN IF EXISTS "total_transferencias"`,
    );
    await queryRunner.query(`
      ALTER TABLE "ventas" ADD CONSTRAINT "CK_ventas_montos" CHECK (
        "total" >= 0 AND "total_pinateria" >= 0 AND "total_papeleria" >= 0
      )
    `);
  }

  /** Vuelve la columna en cero: los montos que tuviera no se pueden recuperar. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ventas" DROP CONSTRAINT IF EXISTS "CK_ventas_montos"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "total_transferencias" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`
      ALTER TABLE "ventas" ADD CONSTRAINT "CK_ventas_montos" CHECK (
        "total" >= 0 AND "total_pinateria" >= 0
        AND "total_papeleria" >= 0 AND "total_transferencias" >= 0
      )
    `);
  }
}
