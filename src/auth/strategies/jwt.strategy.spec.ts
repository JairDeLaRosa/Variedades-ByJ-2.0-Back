import { UnauthorizedException } from "@nestjs/common";
import { Permiso, TODOS_LOS_PERMISOS } from "../permisos";
import { JwtStrategy } from "./jwt.strategy";

const usuario = (rol: object) => ({ id: 7, name: "Ana", rol });
const vendedor = {
  id: 3,
  nombre: "Vendedor",
  clave: null,
  permisos: [{ permiso: Permiso.VentasVer }],
};
const administrador = {
  id: 1,
  nombre: "Administrador",
  clave: "admin",
  permisos: [],
};

describe("JwtStrategy", () => {
  const usuarios = { findOne: jest.fn() };
  const config = { get: jest.fn(() => "secreto-de-prueba-largo") };
  const strategy = new JwtStrategy(config as never, usuarios as never);

  it("toma nombre, rol y permisos de la base de datos, no del token", async () => {
    usuarios.findOne.mockResolvedValue(usuario(vendedor));

    const user = await strategy.validate({ uid: 7 });

    expect(user).toEqual({
      uid: 7,
      name: "Ana",
      rolId: 3,
      rolNombre: "Vendedor",
      esAdmin: false,
      permisos: [Permiso.VentasVer],
    });
    expect(usuarios.findOne.mock.calls[0][0].where).toEqual({ id: 7 });
  });

  it("el Administrador tiene todos los permisos, incluso los que se agreguen", async () => {
    usuarios.findOne.mockResolvedValue(usuario(administrador));

    const user = await strategy.validate({ uid: 7 });

    expect(user.esAdmin).toBe(true);
    expect(user.permisos).toEqual(TODOS_LOS_PERMISOS);
  });

  it("ignora permisos guardados que ya no existen en el catálogo", async () => {
    usuarios.findOne.mockResolvedValue(
      usuario({
        ...vendedor,
        permisos: [
          { permiso: Permiso.VentasVer },
          { permiso: "viejo.borrado" },
        ],
      }),
    );

    expect((await strategy.validate({ uid: 7 })).permisos).toEqual([
      Permiso.VentasVer,
    ]);
  });

  it("un cambio de rol vale en la siguiente petición con el mismo token", async () => {
    usuarios.findOne.mockResolvedValueOnce(usuario(administrador));
    usuarios.findOne.mockResolvedValueOnce(usuario(vendedor));

    expect((await strategy.validate({ uid: 7 })).esAdmin).toBe(true);
    expect((await strategy.validate({ uid: 7 })).esAdmin).toBe(false);
  });

  it("rechaza con 401 si el usuario ya no existe", async () => {
    usuarios.findOne.mockResolvedValue(null);

    await expect(strategy.validate({ uid: 99 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
