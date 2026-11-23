import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RolPermiso } from "./rol-permiso.entity";

/** Roles que trae el sistema y que no se pueden editar ni borrar. */
export type ClaveRol = "admin" | "cliente";

@Entity("roles")
export class Rol {
  @PrimaryGeneratedColumn("increment")
  id: number;

  /** Único sin distinguir mayúsculas (índice en la migración). */
  @Column({ type: "varchar", length: 50 })
  nombre: string;

  @Column({ type: "text", default: "" })
  descripcion: string;

  /**
   * `admin` siempre tiene todos los permisos; `cliente` es el rol de quien se
   * registra y no entra al panel. Los demás roles no tienen clave.
   */
  @Column({ type: "varchar", length: 20, nullable: true, unique: true })
  clave: ClaveRol | null;

  @OneToMany(() => RolPermiso, (permiso) => permiso.rol, { cascade: true })
  permisos: RolPermiso[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
