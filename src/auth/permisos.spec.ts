import { CATALOGO_PERMISOS, Permiso, TODOS_LOS_PERMISOS } from "./permisos";

describe("catálogo de permisos", () => {
  const delCatalogo = CATALOGO_PERMISOS.flatMap((g) =>
    g.permisos.map((p) => p.clave),
  );

  it("todo permiso del enum aparece en el catálogo, una sola vez", () => {
    expect([...delCatalogo].sort()).toEqual([...TODOS_LOS_PERMISOS].sort());
  });

  it("las claves siguen el formato módulo.acción y su módulo coincide con el grupo", () => {
    for (const grupo of CATALOGO_PERMISOS) {
      for (const { clave } of grupo.permisos) {
        expect(clave).toMatch(/^[a-z]+\.[a-z_]+$/);
        expect(clave.startsWith(`${grupo.modulo}.`)).toBe(true);
      }
    }
  });

  it("cada permiso tiene una etiqueta para mostrar", () => {
    for (const grupo of CATALOGO_PERMISOS) {
      expect(grupo.etiqueta.length).toBeGreaterThan(0);
      for (const permiso of grupo.permisos) {
        expect(permiso.etiqueta.length).toBeGreaterThan(0);
      }
    }
  });

  it("incluye los permisos que usan los endpoints actuales", () => {
    expect(TODOS_LOS_PERMISOS).toEqual(
      expect.arrayContaining([
        Permiso.ProductosCrear,
        Permiso.InventarioAjustar,
        Permiso.CierresRegistrar,
        Permiso.SalidasEditar,
        Permiso.ReportesVer,
        Permiso.UsuariosAsignarRoles,
        Permiso.RolesEliminar,
      ]),
    );
  });
});
