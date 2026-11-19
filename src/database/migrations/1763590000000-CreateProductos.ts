import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductos1763590000000 implements MigrationInterface {
  name = "CreateProductos1763590000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "productos" (
        "id" SERIAL NOT NULL,
        "nombre" text NOT NULL,
        "descripcion" text NOT NULL,
        "categoria" text NOT NULL,
        "precio_unidad" integer NOT NULL,
        "stock" integer NOT NULL,
        "descuento" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_productos_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_productos_precio" CHECK ("precio_unidad" >= 0),
        CONSTRAINT "CK_productos_stock" CHECK ("stock" >= 0),
        CONSTRAINT "CK_productos_descuento" CHECK ("descuento" BETWEEN 0 AND 100)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_productos_categoria" ON "productos" ("categoria")`,
    );
    await queryRunner.query(`
      CREATE TABLE "producto_imagenes" (
        "id" SERIAL NOT NULL,
        "producto_id" integer NOT NULL,
        "public_id" text NOT NULL,
        "url" text NOT NULL,
        CONSTRAINT "PK_producto_imagenes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_producto_imagenes_public_id" UNIQUE ("public_id"),
        CONSTRAINT "FK_producto_imagenes_producto" FOREIGN KEY ("producto_id")
          REFERENCES "productos" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_producto_imagenes_producto" ON "producto_imagenes" ("producto_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "producto_imagenes"`);
    await queryRunner.query(`DROP TABLE "productos"`);
  }
}
