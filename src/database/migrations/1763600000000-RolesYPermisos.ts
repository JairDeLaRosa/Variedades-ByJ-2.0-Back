import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Reemplaza la marca `admin` (sí/no) por roles configurables con permisos.
 *
 * Crea Administrador (todos los permisos), Cliente (sin acceso al panel) y
 * Vendedor (un punto de partida editable). Los administradores actuales siguen
 * siéndolo y los demás usuarios quedan como clientes.
 */
export class RolesYPermisos1763600000000 implements MigrationInterface {
  name = "RolesYPermisos1763600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL NOT NULL,
        "nombre" varchar(50) NOT NULL,
        "descripcion" text NOT NULL DEFAULT '',
        "clave" varchar(20),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_clave" UNIQUE ("clave")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_roles_nombre" ON "roles" (lower("nombre"))`,
    );
    await queryRunner.query(`
      CREATE TABLE "rol_permisos" (
        "rol_id" integer NOT NULL,
        "permiso" varchar(60) NOT NULL,
        CONSTRAINT "PK_rol_permisos" PRIMARY KEY ("rol_id", "permiso"),
        CONSTRAINT "FK_rol_permisos_rol" FOREIGN KEY ("rol_id")
          REFERENCES "roles" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("nombre", "descripcion", "clave") VALUES
        ('Administrador', 'Acceso total al sistema.', 'admin'),
        ('Cliente', 'Compra en la tienda; no entra al panel.', 'cliente')
    `);
    await queryRunner.query(`
      INSERT INTO "roles" ("nombre", "descripcion")
        VALUES ('Vendedor', 'Atiende pedidos y registra ventas.')
    `);
    await queryRunner.query(`
      INSERT INTO "rol_permisos" ("rol_id", "permiso")
        SELECT r."id", p."permiso"
        FROM "roles" r
        CROSS JOIN (VALUES
          ('productos.ver'),
          ('pedidos.ver'),
          ('pedidos.gestionar'),
          ('ventas.ver'),
          ('ventas.registrar'),
          ('ventas.comprobante'),
          ('clientes.ver')
        ) AS p("permiso")
        WHERE r."nombre" = 'Vendedor'
    `);

    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN "rol_id" integer`,
    );
    await queryRunner.query(`
      UPDATE "usuarios" SET "rol_id" = (
        SELECT "id" FROM "roles"
        WHERE "clave" = CASE WHEN "usuarios"."admin" THEN 'admin' ELSE 'cliente' END
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "rol_id" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        ADD CONSTRAINT "FK_usuarios_rol" FOREIGN KEY ("rol_id")
        REFERENCES "roles" ("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_usuarios_rol" ON "usuarios" ("rol_id")`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "admin"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN "admin" boolean NOT NULL DEFAULT false`,
    );
    // Solo el rol Administrador tiene equivalente en la marca antigua.
    await queryRunner.query(`
      UPDATE "usuarios" SET "admin" = true
      WHERE "rol_id" = (SELECT "id" FROM "roles" WHERE "clave" = 'admin')
    `);
    await queryRunner.query(`DROP INDEX "IDX_usuarios_rol"`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "FK_usuarios_rol"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "rol_id"`);
    await queryRunner.query(`DROP TABLE "rol_permisos"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
