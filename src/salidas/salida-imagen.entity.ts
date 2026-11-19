import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Salida } from "./salida.entity";

/** Soporte (imagen o PDF) de una salida, guardado en Cloudinary. */
@Entity("salida_imagenes")
export class SalidaImagen {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => Salida, (salida) => salida.imagenes, {
    onDelete: "CASCADE",
    orphanedRowAction: "delete",
  })
  salida: Salida;

  @Column({ name: "public_id", type: "text", unique: true })
  publicId: string;

  @Column({ type: "text" })
  url: string;
}
