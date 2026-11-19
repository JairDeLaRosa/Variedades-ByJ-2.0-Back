import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Producto } from "./producto.entity";

/** Foto de un producto, guardada en Cloudinary. */
@Entity("producto_imagenes")
export class ProductoImagen {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => Producto, (producto) => producto.imagenes, {
    onDelete: "CASCADE",
    orphanedRowAction: "delete",
  })
  @JoinColumn({ name: "producto_id" })
  producto: Producto;

  @Column({ name: "public_id", type: "text", unique: true })
  publicId: string;

  @Column({ type: "text" })
  url: string;
}
