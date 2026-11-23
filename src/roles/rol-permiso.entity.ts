import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Permiso } from "../auth/permisos";
import { Rol } from "./rol.entity";

/** Un permiso concedido a un rol. */
@Entity("rol_permisos")
export class RolPermiso {
  @PrimaryColumn({ name: "rol_id", type: "integer" })
  rolId: number;

  @PrimaryColumn({ type: "varchar", length: 60 })
  permiso: Permiso;

  @ManyToOne(() => Rol, (rol) => rol.permisos, {
    onDelete: "CASCADE",
    orphanedRowAction: "delete",
  })
  @JoinColumn({ name: "rol_id" })
  rol: Rol;
}
