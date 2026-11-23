import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuthUser } from "../auth/auth-user.interface";
import { Permiso } from "../auth/permisos";

export type TipoNotificacion =
  | "pedidos_nuevos"
  | "comprobantes_por_revisar"
  | "pedidos_listos"
  | "productos_agotados"
  | "stock_bajo";

export interface Notificacion {
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string | null;
  /** Cuántos elementos agrupa el aviso. */
  cantidad: number;
  /** Pantalla del panel donde se atiende. */
  href: string;
  /** Desde cuándo está pendiente lo más antiguo (solo en pedidos nuevos). */
  desde: string | null;
}

const MAX_NOMBRES = 3;

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/** «Globos (2), Velas (3) y 4 más» */
const resumen = (partes: string[]) =>
  partes.length <= MAX_NOMBRES
    ? partes.join(", ")
    : `${partes.slice(0, MAX_NOMBRES).join(", ")} y ${partes.length - MAX_NOMBRES} más`;

interface ConteoPedidos {
  pendientes: number;
  listos: number;
  comprobantes: number;
  masAntiguo: Date | null;
}

interface ProductoEscaso {
  nombre: string;
  stock: number;
}

/**
 * Avisos de lo que hay que atender, calculados al momento con el estado real:
 * desaparecen solos cuando se resuelven. Cada persona recibe solo los de las
 * secciones que puede ver.
 */
@Injectable()
export class NotificacionesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listar(actor: AuthUser) {
    const [pedidos, escasos] = await Promise.all([
      actor.permisos.includes(Permiso.PedidosVer) ? this.contarPedidos() : null,
      actor.permisos.includes(Permiso.InventarioVer)
        ? this.productosEscasos()
        : null,
    ]);

    const notificaciones: Notificacion[] = [
      ...(pedidos ? this.avisosDePedidos(pedidos) : []),
      ...(escasos ? this.avisosDeStock(escasos) : []),
    ];
    return {
      total: notificaciones.reduce((suma, n) => suma + n.cantidad, 0),
      notificaciones,
    };
  }

  private async contarPedidos(): Promise<ConteoPedidos> {
    const [fila] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'listo')::int AS listos,
        COUNT(*) FILTER (
          WHERE metodo_pago = 'transferencia'
            AND estado IN ('pendiente', 'confirmado')
            AND comprobante_pago_url IS NOT NULL
        )::int AS comprobantes,
        MIN(created_at) FILTER (WHERE estado = 'pendiente') AS "masAntiguo"
      FROM pedidos
      WHERE estado IN ('pendiente', 'confirmado', 'listo')
    `);
    return fila;
  }

  /** Los que están en su mínimo o por debajo, del más escaso al menos escaso. */
  private productosEscasos(): Promise<ProductoEscaso[]> {
    return this.dataSource.query(`
      SELECT nombre, stock
      FROM productos
      WHERE stock <= stock_minimo
      ORDER BY stock ASC, nombre ASC
      LIMIT 500
    `);
  }

  private avisosDePedidos(c: ConteoPedidos): Notificacion[] {
    const avisos: Notificacion[] = [];
    if (c.pendientes > 0) {
      avisos.push({
        tipo: "pedidos_nuevos",
        titulo: `${plural(c.pendientes, "pedido nuevo", "pedidos nuevos")} por atender`,
        detalle: null,
        cantidad: c.pendientes,
        href: "/admin/pedidos?estado=pendiente",
        desde: c.masAntiguo ? new Date(c.masAntiguo).toISOString() : null,
      });
    }
    if (c.comprobantes > 0) {
      avisos.push({
        tipo: "comprobantes_por_revisar",
        titulo: `${plural(c.comprobantes, "comprobante de transferencia", "comprobantes de transferencia")} por revisar`,
        detalle: "El cliente ya subió el comprobante de pago.",
        cantidad: c.comprobantes,
        href: "/admin/pedidos",
        desde: null,
      });
    }
    if (c.listos > 0) {
      avisos.push({
        tipo: "pedidos_listos",
        titulo: `${plural(c.listos, "pedido listo", "pedidos listos")} esperando al cliente`,
        detalle: null,
        cantidad: c.listos,
        href: "/admin/pedidos?estado=listo",
        desde: null,
      });
    }
    return avisos;
  }

  private avisosDeStock(productos: ProductoEscaso[]): Notificacion[] {
    const agotados = productos.filter((p) => p.stock === 0);
    const bajos = productos.filter((p) => p.stock > 0);
    const avisos: Notificacion[] = [];
    if (agotados.length > 0) {
      avisos.push({
        tipo: "productos_agotados",
        titulo: plural(
          agotados.length,
          "producto agotado",
          "productos agotados",
        ),
        detalle: resumen(agotados.map((p) => p.nombre)),
        cantidad: agotados.length,
        href: "/admin/inventario?filtro=agotados",
        desde: null,
      });
    }
    if (bajos.length > 0) {
      avisos.push({
        tipo: "stock_bajo",
        titulo: plural(
          bajos.length,
          "producto con pocas unidades",
          "productos con pocas unidades",
        ),
        detalle: resumen(bajos.map((p) => `${p.nombre} (${p.stock})`)),
        cantidad: bajos.length,
        href: "/admin/inventario?filtro=pocos",
        desde: null,
      });
    }
    return avisos;
  }
}
