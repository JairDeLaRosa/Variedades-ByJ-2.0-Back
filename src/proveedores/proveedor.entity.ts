import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Proveedor al que se le compra. Solo el nombre es obligatorio; el resto de
 * los datos son opcionales. El nombre es único sin distinguir mayúsculas
 * (índice `UQ_proveedores_nombre`).
 */
@Entity("proveedores")
export class Proveedor {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "text" })
  nombre: string;

  @Column({ type: "text", nullable: true })
  nit: string | null;

  /** Persona de contacto. */
  @Column({ type: "text", nullable: true })
  contacto: string | null;

  @Column({ type: "text", nullable: true })
  telefono: string | null;

  @Column({ type: "text", nullable: true })
  email: string | null;

  @Column({ type: "text", nullable: true })
  direccion: string | null;

  @Column({ type: "text", nullable: true })
  notas: string | null;

  /** Un proveedor desactivado no se ofrece para facturas nuevas. */
  @Column({ type: "boolean", default: true })
  activo: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
