import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/** El único registro de la tabla `configuracion` tiene siempre este id. */
export const ID_CONFIGURACION = 1;

/**
 * Datos del negocio que muestran la tienda (barra, pie de página), el
 * comprobante de venta y la pantalla de pago por transferencia. Hay una sola
 * fila; el administrador la edita desde Configuración.
 */
@Entity("configuracion")
export class Configuracion {
  @PrimaryColumn({ type: "integer", default: ID_CONFIGURACION })
  id: number;

  @Column({ type: "text" })
  nombre: string;

  /** Frase corta bajo el nombre, por ejemplo «Papelería & Piñatería». */
  @Column({ type: "text", nullable: true })
  eslogan: string | null;

  @Column({ type: "text", nullable: true })
  descripcion: string | null;

  @Column({ type: "text", nullable: true })
  nit: string | null;

  @Column({ type: "text", nullable: true })
  direccion: string | null;

  @Column({ type: "text", nullable: true })
  telefono: string | null;

  @Column({ type: "text", nullable: true })
  correo: string | null;

  @Column({ type: "text", nullable: true })
  horario: string | null;

  @Column({ type: "text", nullable: true })
  facebook: string | null;

  @Column({ type: "text", nullable: true })
  instagram: string | null;

  /** Número con el que se abre el chat de WhatsApp. */
  @Column({ type: "text", nullable: true })
  whatsapp: string | null;

  /** Datos para pagar por transferencia, una línea por dato. */
  @Column({ name: "cuenta_transferencia", type: "text", nullable: true })
  cuentaTransferencia: string | null;

  @Column({ name: "logo_public_id", type: "text", nullable: true })
  logoPublicId: string | null;

  @Column({ name: "logo_url", type: "text", nullable: true })
  logoUrl: string | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
