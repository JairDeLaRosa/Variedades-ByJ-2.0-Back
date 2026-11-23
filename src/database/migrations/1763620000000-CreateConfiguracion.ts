import { MigrationInterface, QueryRunner } from "typeorm";

/** Datos del negocio configurables (una sola fila), con los valores que hoy muestra la tienda. */
export class CreateConfiguracion1763620000000 implements MigrationInterface {
  name = "CreateConfiguracion1763620000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "configuracion" (
        "id" integer NOT NULL DEFAULT 1,
        "nombre" text NOT NULL,
        "eslogan" text,
        "descripcion" text,
        "nit" text,
        "direccion" text,
        "telefono" text,
        "correo" text,
        "horario" text,
        "facebook" text,
        "instagram" text,
        "whatsapp" text,
        "cuenta_transferencia" text,
        "logo_public_id" text,
        "logo_url" text,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_configuracion_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_configuracion_unica" CHECK ("id" = 1)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "configuracion"
        ("id", "nombre", "eslogan", "descripcion", "direccion", "telefono", "correo", "horario")
      VALUES (
        1,
        'Variedades B&J',
        'Papelería & Piñatería',
        'Tu tienda de confianza para todos los artículos de papelería, piñatas y decoraciones para fiestas.',
        'Calle Principal #123, Ciudad',
        '+57 300 123 4567',
        'info@variedadesbj.com',
        'Lun - Sáb: 8:00 AM - 7:00 PM'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "configuracion"`);
  }
}
