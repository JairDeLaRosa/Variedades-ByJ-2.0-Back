import {
  AfterLoad,
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
import { Factura } from "../facturas/factura.entity";
import { Proveedor } from "../proveedores/proveedor.entity";
import { SalidaImagen } from "./salida-imagen.entity";

/**
 * Pago o abono que sale del negocio. Se asocia a una factura (total o abono) o
 * es libre, y entonces va asociado a un proveedor. Montos en pesos enteros.
 */
@Entity("salidas")
export class Salida {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Día del pago, `YYYY-MM-DD`; lo elige quien lo registra. */
  @Index()
  @Column({ type: "date" })
  fecha: string;

  /** Valor del pago. */
  @Column({ type: "integer" })
  total: number;

  @Index()
  @Column({ name: "factura_id", type: "integer", nullable: true })
  facturaId: number | null;

  /** Se carga con la salida; no incluye las cuotas ni los soportes de la factura. */
  @ManyToOne(() => Factura, {
    nullable: true,
    onDelete: "RESTRICT",
    eager: true,
  })
  @JoinColumn({ name: "factura_id" })
  factura: Factura | null;

  /**
   * Proveedor de un pago libre. Es `null` cuando hay factura (el proveedor es el
   * de la factura) y obligatorio cuando no la hay (`CK_salidas_proveedor`).
   */
  @Index()
  @Column({ name: "proveedor_id", type: "integer", nullable: true })
  proveedorId: number | null;

  /**
   * Se carga con la salida (`eager`). Las escrituras la cargan con
   * `loadEagerRelations: false`: si no, esta relación pisaría a `proveedorId`.
   */
  @ManyToOne(() => Proveedor, {
    nullable: true,
    onDelete: "RESTRICT",
    eager: true,
  })
  @JoinColumn({ name: "proveedor_id" })
  proveedorRef: Proveedor | null;

  /** Nombre del proveedor: el del pago si es libre, o el de su factura (no es una columna). */
  proveedor: string | null;

  @AfterLoad()
  asignarNombreProveedor(): void {
    this.proveedor =
      this.proveedorRef?.nombre ?? this.factura?.proveedorRef?.nombre ?? null;
  }

  /** Opcional: un detalle libre sobre el pago. */
  @Column({ type: "text", nullable: true })
  nota: string | null;

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
