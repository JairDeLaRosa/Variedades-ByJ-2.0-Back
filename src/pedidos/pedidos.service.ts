import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { AuthUser } from "../auth/auth-user.interface";
import { Usuario } from "../auth/entities/usuario.entity";
import { FilesService } from "../files/files.service";
import { STOCK_MAXIMO } from "../productos/dtos/ajustar-stock.dto";
import { Producto } from "../productos/producto.entity";
import { CambiarEstadoDto } from "./dtos/cambiar-estado.dto";
import { CrearPedidoDto, ItemPedidoDto } from "./dtos/crear-pedido.dto";
import { ListarPedidosQueryDto } from "./dtos/listar-pedidos-query.dto";
import { PedidoItem } from "./pedido-item.entity";
import {
  CanalPedido,
  EstadoPedido,
  MetodoPago,
  SECUENCIA_COMPROBANTE,
  TRANSICIONES,
} from "./pedido.constantes";
import { Pedido } from "./pedido.entity";
import {
  codigoDeComprobante,
  idDesdeNumero,
  numeroDePedido,
  precioConDescuento,
  TOTAL_MAXIMO,
} from "./precios";

const LIMITE_POR_DEFECTO = 20;
const MAX_PEDIDOS_DEL_CLIENTE = 100;

/** Lo que devuelve la API de un pedido. */
export const aRespuesta = (pedido: Pedido) => ({
  id: pedido.id,
  numero: numeroDePedido(pedido.id),
  estado: pedido.estado,
  canal: pedido.canal,
  metodoPago: pedido.metodoPago,
  nota: pedido.nota,
  total: pedido.total,
  cliente: {
    id: pedido.usuarioId,
    nombre: pedido.clienteNombre,
    telefono: pedido.clienteTelefono,
  },
  items: [...(pedido.items ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((i) => ({
      id: i.id,
      productoId: i.productoId,
      nombre: i.nombre,
      precioUnidad: i.precioUnidad,
      cantidad: i.cantidad,
      subtotal: i.subtotal,
    })),
  comprobantePago: pedido.comprobantePagoUrl
    ? { url: pedido.comprobantePagoUrl }
    : null,
  comprobante: pedido.numeroComprobante
    ? codigoDeComprobante(pedido.numeroComprobante)
    : null,
  createdAt: pedido.createdAt,
  entregadoEn: pedido.entregadoEn,
  canceladoEn: pedido.canceladoEn,
});

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private readonly pedidos: Repository<Pedido>,
    private readonly dataSource: DataSource,
    private readonly files: FilesService,
  ) {}

  // --- Cliente -------------------------------------------------------------

  /**
   * Crea un pedido pendiente. Los precios salen del catálogo, no del cliente, y
   * el stock se descuenta en la misma transacción: si falta de cualquier
   * producto no se crea nada y no se descuenta nada.
   */
  crear(actor: AuthUser, dto: CrearPedidoDto) {
    return this.dataSource.transaction(async (m) => {
      const cliente = await m.findOne(Usuario, {
        where: { id: actor.uid },
        select: { id: true, name: true, phone: true },
      });
      if (!cliente) {
        throw new UnauthorizedException("La sesión ya no es válida.");
      }

      const cantidades = this.unirDuplicados(dto.items);
      const productos = await m.find(Producto, {
        where: { id: In([...cantidades.keys()]) },
      });
      const porId = new Map(productos.map((p) => [p.id, p]));

      const items = [...cantidades].map(([productoId, cantidad]) => {
        const producto = porId.get(productoId);
        if (!producto) {
          throw new NotFoundException("Alguno de los productos ya no existe.");
        }
        const precioUnidad = precioConDescuento(
          producto.precioUnidad,
          producto.descuento,
        );
        return m.create(PedidoItem, {
          productoId,
          nombre: producto.nombre,
          precioUnidad,
          cantidad,
          subtotal: precioUnidad * cantidad,
        });
      });

      const total = items.reduce((suma, i) => suma + i.subtotal, 0);
      if (total > TOTAL_MAXIMO) {
        throw new BadRequestException("El pedido supera el valor máximo.");
      }

      for (const item of items) {
        await this.reservarStock(m, item);
      }

      const pedido = await m.save(
        m.create(Pedido, {
          usuarioId: cliente.id,
          clienteNombre: cliente.name,
          clienteTelefono: cliente.phone,
          canal: CanalPedido.Web,
          estado: EstadoPedido.Pendiente,
          metodoPago: dto.metodoPago,
          nota: dto.nota || null,
          total,
          items,
        }),
      );
      return aRespuesta(pedido);
    });
  }

  async listarMios(actor: AuthUser) {
    const pedidos = await this.pedidos.find({
      where: { usuarioId: actor.uid },
      relations: { items: true },
      order: { createdAt: "DESC", id: "DESC" },
      take: MAX_PEDIDOS_DEL_CLIENTE,
    });
    return pedidos.map(aRespuesta);
  }

  async obtenerMio(actor: AuthUser, id: number) {
    return aRespuesta(await this.buscarMio(this.pedidos.manager, actor, id));
  }

  /** El cliente solo puede cancelar mientras el pedido siga pendiente. */
  cancelarMio(actor: AuthUser, id: number) {
    return this.dataSource.transaction(async (m) => {
      const pedido = await this.buscarMio(m, actor, id);
      if (pedido.estado !== EstadoPedido.Pendiente) {
        throw new ConflictException(
          "Solo se puede cancelar un pedido pendiente. Comunícate con la tienda para cambiarlo.",
        );
      }
      return aRespuesta(
        await this.aplicarCambio(m, pedido, EstadoPedido.Cancelado),
      );
    });
  }

  /** Guarda la foto o el PDF de la transferencia; reemplaza el anterior si lo había. */
  async subirComprobante(
    actor: AuthUser,
    id: number,
    archivos: Express.Multer.File[],
  ) {
    if (archivos.length !== 1) {
      throw new BadRequestException(
        "Sube una imagen o un PDF del comprobante de pago.",
      );
    }
    this.files.validarLote(archivos, 0);

    const pedido = await this.buscarMio(this.pedidos.manager, actor, id);
    if (pedido.metodoPago !== MetodoPago.Transferencia) {
      throw new BadRequestException(
        "Este pedido no se paga por transferencia.",
      );
    }
    if (
      pedido.estado !== EstadoPedido.Pendiente &&
      pedido.estado !== EstadoPedido.Confirmado
    ) {
      throw new ConflictException(
        "Ya no se puede enviar el comprobante de este pedido.",
      );
    }

    const [subido] = await this.files.uploadAll(archivos);
    const anterior = pedido.comprobantePagoPublicId;
    pedido.comprobantePagoPublicId = subido.publicId;
    pedido.comprobantePagoUrl = subido.url;
    try {
      await this.pedidos.save(pedido);
    } catch (error) {
      await this.files.deleteFiles([subido.publicId]);
      throw error;
    }
    if (anterior) await this.files.deleteFiles([anterior]);

    return aRespuesta(pedido);
  }

  // --- Personal ------------------------------------------------------------

  async listar({ estado, q, pagina = 1, limite }: ListarPedidosQueryDto) {
    const porPagina = limite ?? LIMITE_POR_DEFECTO;
    const consulta = this.pedidos
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.items", "i")
      .orderBy("p.createdAt", "DESC")
      .addOrderBy("p.id", "DESC")
      .skip((pagina - 1) * porPagina)
      .take(porPagina);

    if (estado) consulta.andWhere("p.estado = :estado", { estado });
    if (q) {
      const id = idDesdeNumero(q);
      if (id !== null) {
        consulta.andWhere("p.id = :id", { id });
      } else {
        consulta.andWhere("p.clienteNombre ILIKE :q", {
          q: `%${q.replace(/[\\%_]/g, "\\$&")}%`,
        });
      }
    }

    const [datos, total] = await consulta.getManyAndCount();
    return { datos: datos.map(aRespuesta), total, pagina, limite: porPagina };
  }

  async obtener(id: number) {
    const pedido = await this.pedidos.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!pedido) throw new NotFoundException("El pedido no existe.");
    return aRespuesta(pedido);
  }

  /**
   * Avanza o cancela un pedido siguiendo `TRANSICIONES`. Al entregarlo se
   * vuelve una venta y recibe su número de comprobante; al cancelarlo, el stock
   * vuelve al catálogo.
   */
  cambiarEstado(id: number, { estado }: CambiarEstadoDto) {
    return this.dataSource.transaction(async (m) => {
      const pedido = await m.findOne(Pedido, {
        where: { id },
        relations: { items: true },
      });
      if (!pedido) throw new NotFoundException("El pedido no existe.");

      if (!TRANSICIONES[pedido.estado].includes(estado)) {
        throw new ConflictException(
          `Un pedido «${pedido.estado}» no puede pasar a «${estado}».`,
        );
      }
      return aRespuesta(await this.aplicarCambio(m, pedido, estado));
    });
  }

  // --- Internos ------------------------------------------------------------

  private buscarMio(m: EntityManager, actor: AuthUser, id: number) {
    return m
      .findOne(Pedido, {
        where: { id, usuarioId: actor.uid },
        relations: { items: true },
      })
      .then((pedido) => {
        // Un pedido ajeno se ve igual que uno inexistente.
        if (!pedido) throw new NotFoundException("El pedido no existe.");
        return pedido;
      });
  }

  /** Suma las líneas repetidas del mismo producto. */
  private unirDuplicados(items: ItemPedidoDto[]) {
    const cantidades = new Map<number, number>();
    for (const { productoId, cantidad } of items) {
      cantidades.set(productoId, (cantidades.get(productoId) ?? 0) + cantidad);
    }
    return cantidades;
  }

  /** Descuenta el stock en una sola sentencia: dos pedidos a la vez no se pisan. */
  private async reservarStock(m: EntityManager, item: PedidoItem) {
    const { affected } = await m
      .createQueryBuilder()
      .update(Producto)
      .set({ stock: () => "stock - :cantidad" })
      .where("id = :id AND stock >= :cantidad", {
        id: item.productoId,
        cantidad: item.cantidad,
      })
      .execute();
    if (affected) return;

    const actual = await m.findOne(Producto, {
      where: { id: item.productoId },
      select: { id: true, stock: true },
    });
    throw new ConflictException(
      `No hay suficiente stock de «${item.nombre}»: quedan ${actual?.stock ?? 0}.`,
    );
  }

  private async devolverStock(m: EntityManager, items: PedidoItem[]) {
    for (const item of items) {
      if (item.productoId === null) continue;
      await m
        .createQueryBuilder()
        .update(Producto)
        .set({ stock: () => "LEAST(stock + :cantidad, :maximo)" })
        .where("id = :id", { id: item.productoId, cantidad: item.cantidad })
        .setParameter("maximo", STOCK_MAXIMO)
        .execute();
    }
  }

  /**
   * Aplica el cambio de estado con el estado anterior como condición: si otra
   * persona lo cambió mientras tanto, no se pisa y se avisa.
   */
  private async aplicarCambio(
    m: EntityManager,
    pedido: Pedido,
    nuevo: EstadoPedido,
  ): Promise<Pedido> {
    const cambios: QueryDeepPartialEntity<Pedido> = { estado: nuevo };

    if (nuevo === EstadoPedido.Cancelado) {
      cambios.canceladoEn = new Date();
      await this.devolverStock(m, pedido.items);
    }
    if (nuevo === EstadoPedido.Entregado) {
      cambios.entregadoEn = new Date();
      cambios.numeroComprobante = () => `nextval('${SECUENCIA_COMPROBANTE}')`;
    }

    const { affected } = await m.update(
      Pedido,
      { id: pedido.id, estado: pedido.estado },
      cambios,
    );
    if (!affected) {
      throw new ConflictException(
        "El pedido cambió mientras lo editabas. Vuelve a cargarlo.",
      );
    }

    return (await m.findOne(Pedido, {
      where: { id: pedido.id },
      relations: { items: true },
    })) as Pedido;
  }
}
