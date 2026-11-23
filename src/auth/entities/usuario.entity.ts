import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Rol } from "../../roles/rol.entity";

@Entity("usuarios")
export class Usuario {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text", unique: true })
  email: string;

  @Column({ type: "text" })
  phone: string;

  @Column({ type: "text", select: false })
  password: string;

  @Index("IDX_usuarios_rol")
  @Column({ name: "rol_id", type: "integer" })
  rolId: number;

  /** El rol define qué puede hacer: ver `permisos.ts`. */
  @ManyToOne(() => Rol, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "rol_id" })
  rol: Rol;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
