import { MigrationInterface, QueryRunner } from "typeorm";

const EXISTE_COLUMNA = (tabla: string, columna: string) => `
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = '${tabla}' AND column_name = '${columna}'
  )`;

/**
 * Crea `proveedores` y enlaza cada factura con el suyo (`facturas.proveedor_id`).
 * Por cada nombre distinto de `facturas.proveedor` (sin distinguir mayúsculas
 * ni espacios de los bordes) crea un proveedor, enlaza las facturas y quita la
 * columna de texto. Idempotente: si la columna de texto ya no existe, solo
 * asegura el resto.
 */
export class CreateProveedores1763660000000 implements MigrationInterface {
  name = "CreateProveedores1763660000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "proveedores" (
        "id" SERIAL NOT NULL,
        "nombre" text NOT NULL,
        "nit" text,
        "contacto" text,
        "telefono" text,
        "email" text,
        "direccion" text,
        "notas" text,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_proveedores_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_proveedores_nombre" ON "proveedores" (lower("nombre"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "facturas" ADD COLUMN IF NOT EXISTS "proveedor_id" integer`,
    );
    // Anidado: las consultas con `facturas.proveedor` solo se planifican si la columna existe.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF ${EXISTE_COLUMNA("facturas", "proveedor")} THEN
          INSERT INTO "proveedores" ("nombre")
          SELECT DISTINCT ON (lower(COALESCE(NULLIF(trim("proveedor"), ''), 'Sin proveedor')))
                 COALESCE(NULLIF(trim("proveedor"), ''), 'Sin proveedor')
          FROM "facturas"
          ORDER BY lower(COALESCE(NULLIF(trim("proveedor"), ''), 'Sin proveedor')), "id"
          ON CONFLICT DO NOTHING;

          UPDATE "facturas" f
          SET "proveedor_id" = p."id"
          FROM "proveedores" p
          WHERE f."proveedor_id" IS NULL
            AND lower(p."nombre") = lower(COALESCE(NULLIF(trim(f."proveedor"), ''), 'Sin proveedor'));
        END IF;
      END $$
    `);

    await queryRunner.query(
      `ALTER TABLE "facturas" ALTER COLUMN "proveedor_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "facturas" DROP CONSTRAINT IF EXISTS "FK_facturas_proveedor"`,
    );
    await queryRunner.query(`
      ALTER TABLE "facturas"
        ADD CONSTRAINT "FK_facturas_proveedor"
        FOREIGN KEY ("proveedor_id") REFERENCES "proveedores" ("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_facturas_proveedor_id" ON "facturas" ("proveedor_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "facturas" DROP COLUMN IF EXISTS "proveedor"`,
    );
  }

  /** Vuelve el nombre como texto en cada factura y borra `proveedores` (se pierden sus datos de contacto). */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "facturas" ADD COLUMN IF NOT EXISTS "proveedor" text`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF ${EXISTE_COLUMNA("facturas", "proveedor_id")} THEN
          UPDATE "facturas" f
          SET "proveedor" = p."nombre"
          FROM "proveedores" p
          WHERE f."proveedor" IS NULL AND p."id" = f."proveedor_id";
        END IF;
      END $$
    `);
    await queryRunner.query(
      `UPDATE "facturas" SET "proveedor" = 'Sin proveedor' WHERE "proveedor" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "facturas" ALTER COLUMN "proveedor" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "facturas" DROP CONSTRAINT IF EXISTS "FK_facturas_proveedor"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_facturas_proveedor_id"`);
    await queryRunner.query(
      `ALTER TABLE "facturas" DROP COLUMN IF EXISTS "proveedor_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "proveedores"`);
  }
}
