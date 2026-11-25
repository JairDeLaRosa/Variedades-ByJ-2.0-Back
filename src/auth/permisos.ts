/**
 * Acciones que se pueden permitir o negar a un rol. Cada endpoint protegido
 * declara cuál exige con `@Autorizar(Permiso.X)`. La lista vive aquí, en el
 * código: los roles (en la base de datos) solo eligen cuáles tienen.
 *
 * Formato: `módulo.acción`. Al agregar uno nuevo, el Administrador lo recibe
 * solo (siempre tiene todos); a los demás roles hay que dárselo.
 */
export enum Permiso {
  DashboardVer = "dashboard.ver",

  ProductosVer = "productos.ver",
  ProductosCrear = "productos.crear",
  ProductosEditar = "productos.editar",
  ProductosEliminar = "productos.eliminar",

  InventarioVer = "inventario.ver",
  InventarioAjustar = "inventario.ajustar",

  PedidosVer = "pedidos.ver",
  PedidosGestionar = "pedidos.gestionar",

  VentasVer = "ventas.ver",
  VentasRegistrar = "ventas.registrar",
  VentasComprobante = "ventas.comprobante",
  VentasAnular = "ventas.anular",

  ClientesVer = "clientes.ver",

  CierresVer = "cierres.ver",
  CierresRegistrar = "cierres.registrar",
  CierresEliminar = "cierres.eliminar",

  SalidasVer = "salidas.ver",
  SalidasRegistrar = "salidas.registrar",
  SalidasEditar = "salidas.editar",
  SalidasEliminar = "salidas.eliminar",

  FacturasVer = "facturas.ver",
  FacturasRegistrar = "facturas.registrar",
  FacturasEditar = "facturas.editar",
  FacturasEliminar = "facturas.eliminar",

  ReportesVer = "reportes.ver",

  UsuariosVer = "usuarios.ver",
  UsuariosAsignarRoles = "usuarios.asignar_roles",

  ConfiguracionEditar = "configuracion.editar",

  RolesVer = "roles.ver",
  RolesCrear = "roles.crear",
  RolesEditar = "roles.editar",
  RolesEliminar = "roles.eliminar",
}

export interface DefinicionPermiso {
  clave: Permiso;
  etiqueta: string;
  /** Aclaración que la pantalla de roles muestra junto a la casilla. */
  nota?: string;
}

export interface GrupoPermisos {
  modulo: string;
  etiqueta: string;
  permisos: DefinicionPermiso[];
}

const PROXIMAMENTE = "Se activa con el módulo de ventas.";

/** Los permisos agrupados por módulo, tal como los muestra la pantalla de roles. */
export const CATALOGO_PERMISOS: GrupoPermisos[] = [
  {
    modulo: "dashboard",
    etiqueta: "Dashboard",
    permisos: [
      {
        clave: Permiso.DashboardVer,
        etiqueta: "Ver el dashboard",
        nota: "Muestra datos del cierre diario y de las salidas.",
      },
    ],
  },
  {
    modulo: "productos",
    etiqueta: "Productos",
    permisos: [
      { clave: Permiso.ProductosVer, etiqueta: "Ver la lista en el panel" },
      { clave: Permiso.ProductosCrear, etiqueta: "Crear productos" },
      { clave: Permiso.ProductosEditar, etiqueta: "Editar productos" },
      { clave: Permiso.ProductosEliminar, etiqueta: "Eliminar productos" },
    ],
  },
  {
    modulo: "inventario",
    etiqueta: "Inventario",
    permisos: [
      { clave: Permiso.InventarioVer, etiqueta: "Ver el inventario" },
      { clave: Permiso.InventarioAjustar, etiqueta: "Ajustar el stock" },
    ],
  },
  {
    modulo: "pedidos",
    etiqueta: "Pedidos",
    permisos: [
      { clave: Permiso.PedidosVer, etiqueta: "Ver pedidos" },
      {
        clave: Permiso.PedidosGestionar,
        etiqueta: "Gestionar pedidos (cambiar estado y cancelar)",
      },
    ],
  },
  {
    modulo: "ventas",
    etiqueta: "Ventas",
    permisos: [
      {
        clave: Permiso.VentasVer,
        etiqueta: "Ver ventas",
        nota: "Pedidos entregados y ventas de mostrador.",
      },
      {
        clave: Permiso.VentasRegistrar,
        etiqueta: "Registrar ventas de mostrador",
      },
      {
        clave: Permiso.VentasComprobante,
        etiqueta: "Ver el comprobante de una venta",
      },
      {
        clave: Permiso.VentasAnular,
        etiqueta: "Anular ventas",
        nota: PROXIMAMENTE,
      },
    ],
  },
  {
    modulo: "clientes",
    etiqueta: "Clientes",
    permisos: [
      {
        clave: Permiso.ClientesVer,
        etiqueta: "Ver clientes",
        nota: "Hoy la pantalla muestra datos de ejemplo.",
      },
    ],
  },
  {
    modulo: "cierres",
    etiqueta: "Cierre diario",
    permisos: [
      { clave: Permiso.CierresVer, etiqueta: "Ver los cierres" },
      { clave: Permiso.CierresRegistrar, etiqueta: "Registrar un cierre" },
      { clave: Permiso.CierresEliminar, etiqueta: "Eliminar un cierre" },
    ],
  },
  {
    modulo: "salidas",
    etiqueta: "Salidas (pagos y abonos)",
    permisos: [
      { clave: Permiso.SalidasVer, etiqueta: "Ver salidas" },
      { clave: Permiso.SalidasRegistrar, etiqueta: "Registrar salidas" },
      { clave: Permiso.SalidasEditar, etiqueta: "Editar salidas" },
      { clave: Permiso.SalidasEliminar, etiqueta: "Eliminar salidas" },
    ],
  },
  {
    modulo: "facturas",
    etiqueta: "Facturas de compra",
    permisos: [
      {
        clave: Permiso.FacturasVer,
        etiqueta: "Ver facturas",
        nota: "Incluye lo pagado y lo que se debe.",
      },
      { clave: Permiso.FacturasRegistrar, etiqueta: "Registrar facturas" },
      { clave: Permiso.FacturasEditar, etiqueta: "Editar facturas" },
      { clave: Permiso.FacturasEliminar, etiqueta: "Eliminar facturas" },
    ],
  },
  {
    modulo: "reportes",
    etiqueta: "Reportes",
    permisos: [{ clave: Permiso.ReportesVer, etiqueta: "Ver reportes" }],
  },
  {
    modulo: "usuarios",
    etiqueta: "Usuarios",
    permisos: [
      { clave: Permiso.UsuariosVer, etiqueta: "Ver usuarios" },
      { clave: Permiso.UsuariosAsignarRoles, etiqueta: "Asignar roles" },
    ],
  },
  {
    modulo: "configuracion",
    etiqueta: "Configuración",
    permisos: [
      {
        clave: Permiso.ConfiguracionEditar,
        etiqueta: "Editar los datos del negocio",
        nota: "Nombre, logo, contacto, redes y datos de transferencia que ve la tienda.",
      },
    ],
  },
  {
    modulo: "roles",
    etiqueta: "Roles",
    permisos: [
      { clave: Permiso.RolesVer, etiqueta: "Ver roles" },
      { clave: Permiso.RolesCrear, etiqueta: "Crear roles" },
      { clave: Permiso.RolesEditar, etiqueta: "Editar roles" },
      { clave: Permiso.RolesEliminar, etiqueta: "Eliminar roles" },
    ],
  },
];

export const TODOS_LOS_PERMISOS: Permiso[] = Object.values(Permiso);
