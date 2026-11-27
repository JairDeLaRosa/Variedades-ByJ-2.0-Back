import { MigrationInterface, QueryRunner } from "typeorm";

const EXISTE_COLUMNA = (tabla: string, columna: string) => `
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = '${tabla}' AND column_name = '${columna}'
  )`;

/**
 * Los pagos libres (salidas sin factura) pasan a asociarse a un proveedor
 * (`salidas.proveedor_id`) y la nota deja de ser obligatoria.
 *
 * Los pagos libres que ya existen guardaban el nombre del proveedor como texto
 * en la nota: por cada nombre distinto (sin distinguir mayúsculas ni espacios
 * de los bordes) se reutiliza el proveedor que ya tenga ese nombre o se crea
 * uno, y el pago se asocia a él. La nota se conserva tal cual. Idempotente.
 */
export class SalidasProveedor1763680000000 implements MigrationInterface {
  name = "SalidasProveedor1763680000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "salidas" ADD COLUMN IF NOT EXISTS "proveedor_id" integer`,
    );

    // Los proveedores que falten, a partir de la nota de cada pago libre.
    await queryRunner.query(`
      INSERT INTO "proveedores" ("nombre")
      SELECT DISTINCT ON (lower(btrim("nota"))) btrim("nota")
      FROM "salidas"
      WHERE "factura_id" IS NULL AND "proveedor_id" IS NULL
        AND btrim(coalesce("nota", '')) <> ''
      ORDER BY lower(btrim("nota")), "id"
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE "salidas" s
      SET "proveedor_id" = p."id"
      FROM "proveedores" p
      WHERE s."factura_id" IS NULL AND s."proveedor_id" IS NULL
        AND lower(p."nombre") = lower(btrim(s."nota"))
    `);

    await queryRunner.query(
      `ALTER TABLE "salidas" DROP CONSTRAINT IF EXISTS "CK_salidas_factura_o_nota"`,
    );
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP CONSTRAINT IF EXISTS "FK_salidas_proveedor"`,
    );
    await queryRunner.query(`
      ALTER TABLE "salidas"
        ADD CONSTRAINT "FK_salidas_proveedor"
        FOREIGN KEY ("proveedor_id") REFERENCES "proveedores" ("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_salidas_proveedor" ON "salidas" ("proveedor_id")`,
    );
    // Un pago es de una factura o de un proveedor (libre), nunca de ambos ni de ninguno.
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP CONSTRAINT IF EXISTS "CK_salidas_proveedor"`,
    );
    await queryRunner.query(`
      ALTER TABLE "salidas"
        ADD CONSTRAINT "CK_salidas_proveedor"
        CHECK (("factura_id" IS NULL) = ("proveedor_id" IS NOT NULL))
    `);
  }

  /**
   * Vuelve a exigir la nota en los pagos libres: la que esté vacía toma el
   * nombre del proveedor. Se pierde la asociación, no el nombre.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP CONSTRAINT IF EXISTS "CK_salidas_proveedor"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF ${EXISTE_COLUMNA("salidas", "proveedor_id")} THEN
          UPDATE "salidas" s
          SET "nota" = p."nombre"
          FROM "proveedores" p
          WHERE s."factura_id" IS NULL AND p."id" = s."proveedor_id"
            AND btrim(coalesce(s."nota", '')) = '';
        END IF;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP CONSTRAINT IF EXISTS "FK_salidas_proveedor"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_salidas_proveedor"`);
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP COLUMN IF EXISTS "proveedor_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "salidas" DROP CONSTRAINT IF EXISTS "CK_salidas_factura_o_nota"`,
    );
    await queryRunner.query(`
      ALTER TABLE "salidas"
        ADD CONSTRAINT "CK_salidas_factura_o_nota"
        CHECK ("factura_id" IS NOT NULL OR btrim(coalesce("nota", '')) <> '')
    `);
  }
}
