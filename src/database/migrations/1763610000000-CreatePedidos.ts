import { MigrationInterface, QueryRunner } from "typeorm";

/** Pedidos (y ventas de mostrador), sus líneas y la secuencia de comprobantes. */
export class CreatePedidos1763610000000 implements MigrationInterface {
  name = "CreatePedidos1763610000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE "comprobante_numero_seq" START 1`);

    await queryRunner.query(`
      CREATE TABLE "pedidos" (
        "id" SERIAL NOT NULL,
        "usuario_id" integer,
        "cliente_nombre" text NOT NULL,
        "cliente_telefono" text,
        "canal" varchar(20) NOT NULL DEFAULT 'web',
        "estado" varchar(20) NOT NULL DEFAULT 'pendiente',
        "metodo_pago" varchar(20) NOT NULL,
        "nota" text,
        "total" integer NOT NULL,
        "comprobante_pago_public_id" text,
        "comprobante_pago_url" text,
        "numero_comprobante" integer,
        "entregado_en" timestamptz,
        "cancelado_en" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pedidos_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pedidos_numero_comprobante" UNIQUE ("numero_comprobante"),
        CONSTRAINT "FK_pedidos_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios" ("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_pedidos_estado" CHECK ("estado" IN
          ('pendiente', 'confirmado', 'listo', 'entregado', 'cancelado')),
        CONSTRAINT "CHK_pedidos_canal" CHECK ("canal" IN ('web', 'mostrador')),
        CONSTRAINT "CHK_pedidos_metodo_pago" CHECK ("metodo_pago" IN
          ('efectivo', 'transferencia')),
        CONSTRAINT "CHK_pedidos_total" CHECK ("total" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pedidos_usuario" ON "pedidos" ("usuario_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pedidos_estado" ON "pedidos" ("estado")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pedidos_created_at" ON "pedidos" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "pedido_items" (
        "id" SERIAL NOT NULL,
        "pedido_id" integer NOT NULL,
        "producto_id" integer,
        "nombre" text NOT NULL,
        "precio_unidad" integer NOT NULL,
        "cantidad" integer NOT NULL,
        "subtotal" integer NOT NULL,
        CONSTRAINT "PK_pedido_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pedido_items_pedido" FOREIGN KEY ("pedido_id")
          REFERENCES "pedidos" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pedido_items_producto" FOREIGN KEY ("producto_id")
          REFERENCES "productos" ("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_pedido_items_cantidad" CHECK ("cantidad" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pedido_items_pedido" ON "pedido_items" ("pedido_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pedido_items"`);
    await queryRunner.query(`DROP TABLE "pedidos"`);
    await queryRunner.query(`DROP SEQUENCE "comprobante_numero_seq"`);
  }
}
