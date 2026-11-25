import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Factura } from "./factura.entity";

/** Cuota del calendario de una factura a cuotas. */
@Entity("factura_cuotas")
export class FacturaCuota {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => Factura, (factura) => factura.cuotas, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "factura_id" })
  factura: Factura;

  @Column({ type: "integer" })
  numero: number;

  /** Fecha límite de la cuota, `YYYY-MM-DD`. */
  @Column({ type: "date" })
  vence: string;

  @Column({ type: "integer" })
  monto: number;
}
