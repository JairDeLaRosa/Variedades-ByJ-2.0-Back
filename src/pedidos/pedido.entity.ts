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
import { Usuario } from "../auth/entities/usuario.entity";
import { CanalPedido, EstadoPedido, MetodoPago } from "./pedido.constantes";
import { PedidoItem } from "./pedido-item.entity";

/**
 * Un pedido de la tienda en línea o una venta de mostrador. Cuando llega a
 * «entregado» es una venta y recibe su número de comprobante. Los precios son
 * pesos colombianos enteros y se copian al crear el pedido: un cambio posterior
 * en el catálogo no altera lo que ya se vendió.
 */
@Entity("pedidos")
export class Pedido {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** El cliente con cuenta; vacío en una venta de mostrador sin cliente. */
  @Column({ name: "usuario_id", type: "integer", nullable: true })
  usuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "usuario_id" })
  usuario: Usuario | null;

  /** Datos del cliente al momento del pedido (se conservan aunque cambie su cuenta). */
  @Column({ name: "cliente_nombre", type: "text" })
  clienteNombre: string;

  @Column({ name: "cliente_telefono", type: "text", nullable: true })
  clienteTelefono: string | null;

  @Column({ type: "varchar", length: 20, default: CanalPedido.Web })
  canal: CanalPedido;

  @Column({ type: "varchar", length: 20, default: EstadoPedido.Pendiente })
  estado: EstadoPedido;

  @Column({ name: "metodo_pago", type: "varchar", length: 20 })
  metodoPago: MetodoPago;

  @Column({ type: "text", nullable: true })
  nota: string | null;

  @Column({ type: "integer" })
  total: number;

  @Column({ name: "comprobante_pago_public_id", type: "text", nullable: true })
  comprobantePagoPublicId: string | null;

  @Column({ name: "comprobante_pago_url", type: "text", nullable: true })
  comprobantePagoUrl: string | null;

  /** Número consecutivo del comprobante de venta; se asigna al entregar. */
  @Column({
    name: "numero_comprobante",
    type: "integer",
    nullable: true,
    unique: true,
  })
  numeroComprobante: number | null;

  @Column({ name: "entregado_en", type: "timestamptz", nullable: true })
  entregadoEn: Date | null;

  @Column({ name: "cancelado_en", type: "timestamptz", nullable: true })
  canceladoEn: Date | null;

  @OneToMany(() => PedidoItem, (item) => item.pedido, { cascade: true })
  items: PedidoItem[];

  @Index("IDX_pedidos_created_at")
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
