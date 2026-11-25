import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Factura } from "./factura.entity";

/** Soporte (imagen o PDF) de una factura, guardado en Cloudinary. */
@Entity("factura_imagenes")
export class FacturaImagen {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => Factura, (factura) => factura.imagenes, {
    onDelete: "CASCADE",
    orphanedRowAction: "delete",
  })
  @JoinColumn({ name: "factura_id" })
  factura: Factura;

  @Column({ name: "public_id", type: "text", unique: true })
  publicId: string;

  @Column({ type: "text" })
  url: string;
}
