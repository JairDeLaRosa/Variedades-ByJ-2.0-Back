import { AuthUser } from "../auth/auth-user.interface";
import { Permiso } from "../auth/permisos";
import { NotificacionesService } from "./notificaciones.service";

const actor = (permisos: Permiso[]): AuthUser => ({
  uid: 1,
  name: "Ana",
  rolId: 1,
  rolNombre: "Vendedor",
  esAdmin: false,
  permisos,
});

const CONTEO = {
  pendientes: 2,
  listos: 1,
  comprobantes: 1,
  masAntiguo: new Date("2026-11-23T15:00:00Z"),
};

describe("NotificacionesService", () => {
  const dataSource = { query: jest.fn() };
  let service: NotificacionesService;

  /** Responde según la tabla que consulta cada sentencia. */
  const responder = (conteo: object, escasos: object[]) =>
    dataSource.query.mockImplementation((sql: string) =>
      Promise.resolve(sql.includes("FROM pedidos") ? [conteo] : escasos),
    );

  beforeEach(() => {
    dataSource.query.mockReset();
    service = new NotificacionesService(dataSource as never);
  });

  it("agrupa pedidos y stock para quien puede ver ambos", async () => {
    responder(CONTEO, [
      { nombre: "Velas", stock: 0 },
      { nombre: "Globos", stock: 2 },
      { nombre: "Cinta", stock: 3 },
    ]);

    const res = await service.listar(
      actor([Permiso.PedidosVer, Permiso.InventarioVer]),
    );

    expect(res.notificaciones.map((n) => n.tipo)).toEqual([
      "pedidos_nuevos",
      "comprobantes_por_revisar",
      "pedidos_listos",
      "productos_agotados",
      "stock_bajo",
    ]);
    expect(res.total).toBe(2 + 1 + 1 + 1 + 2);
    const nuevos = res.notificaciones[0];
    expect(nuevos).toMatchObject({
      titulo: "2 pedidos nuevos por atender",
      href: "/admin/pedidos?estado=pendiente",
      desde: "2026-11-23T15:00:00.000Z",
    });
    expect(res.notificaciones[4].detalle).toBe("Globos (2), Cinta (3)");
  });

  it("solo consulta lo que la persona puede ver", async () => {
    responder(CONTEO, []);

    const res = await service.listar(actor([Permiso.PedidosVer]));

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(res.notificaciones.every((n) => n.href.includes("pedidos"))).toBe(
      true,
    );
  });

  it("sin permisos no hay avisos ni consultas", async () => {
    const res = await service.listar(actor([]));

    expect(res).toEqual({ total: 0, notificaciones: [] });
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it("no avisa lo que está en cero", async () => {
    responder(
      { pendientes: 0, listos: 0, comprobantes: 0, masAntiguo: null },
      [],
    );

    const res = await service.listar(
      actor([Permiso.PedidosVer, Permiso.InventarioVer]),
    );

    expect(res.notificaciones).toEqual([]);
  });

  it("resume con «y N más» cuando hay muchos productos", async () => {
    responder(
      CONTEO,
      ["A", "B", "C", "D", "E"].map((nombre) => ({ nombre, stock: 0 })),
    );

    const res = await service.listar(actor([Permiso.InventarioVer]));

    expect(res.notificaciones[0]).toMatchObject({
      titulo: "5 productos agotados",
      detalle: "A, B, C y 2 más",
    });
  });

  it("usa el singular con un solo elemento", async () => {
    responder({ ...CONTEO, pendientes: 1, comprobantes: 0, listos: 0 }, []);

    const res = await service.listar(actor([Permiso.PedidosVer]));

    expect(res.notificaciones[0].titulo).toBe("1 pedido nuevo por atender");
  });
});
