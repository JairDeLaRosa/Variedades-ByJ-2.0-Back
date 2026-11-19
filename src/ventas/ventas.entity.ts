import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/** Cierre de ventas de un día. Los montos son pesos colombianos enteros. */
@Entity("ventas")
export class Venta {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Día de negocio en formato `YYYY-MM-DD`, único. */
  @Column({ type: "date", unique: true })
  fecha: string;

  @Column({ type: "integer" })
  total: number;

  @Column({ name: "total_pinateria", type: "integer" })
  totalPinateria: number;

  @Column({ name: "total_papeleria", type: "integer" })
  totalPapeleria: number;

  @Column({ name: "total_transferencias", type: "integer", default: 0 })
  totalTransferencias: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
