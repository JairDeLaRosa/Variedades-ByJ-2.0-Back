import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SalidaImagen } from "./salida-imagen.entity";

/** Compra a una tienda, con su factura y soportes. Montos en pesos enteros. */
@Entity("salidas")
export class Salida {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Día de la compra, `YYYY-MM-DD`. */
  @Index()
  @Column({ type: "date" })
  fecha: string;

  @Column({ type: "integer" })
  total: number;

  @Column({ type: "text" })
  factura: string;

  @Column({ type: "text" })
  tienda: string;

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
