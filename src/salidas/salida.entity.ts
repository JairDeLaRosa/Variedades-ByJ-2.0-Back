import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Factura } from "../facturas/factura.entity";
import { SalidaImagen } from "./salida-imagen.entity";

/**
 * Pago o abono que sale del negocio. Se asocia a una factura (total o abono) o
 * es libre, y entonces la nota dice a qué se refiere. Montos en pesos enteros.
 */
@Entity("salidas")
export class Salida {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Día del pago, `YYYY-MM-DD`; lo elige quien lo registra. */
  @Index()
  @Column({ type: "date" })
  fecha: string;

  /** Valor del pago. */
  @Column({ type: "integer" })
  total: number;

  @Index()
  @Column({ name: "factura_id", type: "integer", nullable: true })
  facturaId: number | null;

  /** Se carga con la salida; no incluye las cuotas ni los soportes de la factura. */
  @ManyToOne(() => Factura, {
    nullable: true,
    onDelete: "RESTRICT",
    eager: true,
  })
  @JoinColumn({ name: "factura_id" })
  factura: Factura | null;

  /** Obligatoria cuando la salida no tiene factura. */
  @Column({ type: "text", nullable: true })
  nota: string | null;

  @OneToMany(() => SalidaImagen, (imagen) => imagen.salida, {
    cascade: true,
    eager: true,
  })
  imagenes: SalidaImagen[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
