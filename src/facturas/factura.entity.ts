import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Modalidad, Periodicidad } from "./calculos";
import { FacturaCuota } from "./factura-cuota.entity";
import { FacturaImagen } from "./factura-imagen.entity";

/**
 * Factura de compra a un proveedor. Montos en pesos enteros. Lo pagado se
 * calcula con las salidas (abonos) de la factura; no se guarda aquí.
 */
@Entity("facturas")
export class Factura {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Único sin distinguir mayúsculas (índice `UQ_facturas_numero`). */
  @Column({ type: "text" })
  numero: string;

  @Column({ type: "text" })
  proveedor: string;

  /** Día de la factura, `YYYY-MM-DD`. */
  @Index()
  @Column({ type: "date" })
  fecha: string;

  /** Valor de la factura, sin interés. */
  @Column({ type: "integer" })
  total: number;

  @Column({ type: "varchar", length: 10 })
  modalidad: Modalidad;

  /** Fecha límite de pago (solo modalidad `plazo`). */
  @Column({ type: "date", nullable: true })
  vence: string | null;

  /** Cada cuánto vence una cuota (solo modalidad `cuotas`). */
  @Column({ type: "varchar", length: 10, nullable: true })
  periodicidad: Periodicidad | null;

  @Column({
    name: "interes_porcentaje",
    type: "numeric",
    precision: 5,
    scale: 2,
    default: 0,
    // Postgres devuelve `numeric` como texto.
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  interesPorcentaje: number;

  @Column({ name: "interes_monto", type: "integer", default: 0 })
  interesMonto: number;

  @Column({ type: "text", nullable: true })
  notas: string | null;

  /** No es `eager`: las salidas cargan su factura y no deben arrastrar esto. */
  @OneToMany(() => FacturaCuota, (cuota) => cuota.factura, { cascade: true })
  cuotas: FacturaCuota[];

  @OneToMany(() => FacturaImagen, (imagen) => imagen.factura, {
    cascade: true,
  })
  imagenes: FacturaImagen[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
