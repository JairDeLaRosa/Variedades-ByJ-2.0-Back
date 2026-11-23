import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ProductoImagen } from "./producto-imagen.entity";

/** Producto del catálogo. Precios en pesos colombianos enteros. */
@Entity("productos")
export class Producto {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "text" })
  nombre: string;

  @Column({ type: "text" })
  descripcion: string;

  @Index()
  @Column({ type: "text" })
  categoria: string;

  @Column({ name: "precio_unidad", type: "integer" })
  precioUnidad: number;

  @Column({ type: "integer" })
  stock: number;

  /** Desde cuántas unidades se avisa «stock bajo»; cada producto tiene el suyo. */
  @Column({ name: "stock_minimo", type: "integer", default: 5 })
  stockMinimo: number;

  /** Descuento en porcentaje, de 0 a 100. */
  @Column({ type: "integer", default: 0 })
  descuento: number;

  @OneToMany(() => ProductoImagen, (imagen) => imagen.producto, {
    cascade: true,
    eager: true,
  })
  imagenes: ProductoImagen[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
