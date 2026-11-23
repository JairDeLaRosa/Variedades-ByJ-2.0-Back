import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Producto } from "../productos/producto.entity";
import { Pedido } from "./pedido.entity";

/** Una línea del pedido, con el nombre y el precio que tenía el producto al venderse. */
@Entity("pedido_items")
export class PedidoItem {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "pedido_id" })
  pedido: Pedido;

  /** Se vacía si el producto se elimina del catálogo; la línea sigue contando. */
  @Column({ name: "producto_id", type: "integer", nullable: true })
  productoId: number | null;

  @ManyToOne(() => Producto, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "producto_id" })
  producto: Producto | null;

  @Column({ type: "text" })
  nombre: string;

  /** Precio de una unidad con el descuento ya aplicado. */
  @Column({ name: "precio_unidad", type: "integer" })
  precioUnidad: number;

  @Column({ type: "integer" })
  cantidad: number;

  @Column({ type: "integer" })
  subtotal: number;
}
