import {
  codigoDeComprobante,
  idDesdeNumero,
  numeroDePedido,
  precioConDescuento,
} from "./precios";

describe("precioConDescuento", () => {
  it("aplica el porcentaje y redondea al peso", () => {
    expect(precioConDescuento(28000, 20)).toBe(22400);
    expect(precioConDescuento(999, 15)).toBe(849);
  });

  it("sin descuento deja el precio, y con 100 % queda gratis", () => {
    expect(precioConDescuento(15000, 0)).toBe(15000);
    expect(precioConDescuento(15000, 100)).toBe(0);
  });
});

describe("códigos", () => {
  it("numera el pedido y el comprobante con ceros a la izquierda", () => {
    expect(numeroDePedido(7)).toBe("PED-0007");
    expect(numeroDePedido(12345)).toBe("PED-12345");
    expect(codigoDeComprobante(42)).toBe("CV-000042");
  });
});

describe("idDesdeNumero", () => {
  it("reconoce el número de pedido escrito de varias formas", () => {
    expect(idDesdeNumero("PED-0012")).toBe(12);
    expect(idDesdeNumero("ped12")).toBe(12);
    expect(idDesdeNumero("12")).toBe(12);
  });

  it("devuelve null si es un nombre, para buscar por texto", () => {
    expect(idDesdeNumero("Ana")).toBeNull();
    expect(idDesdeNumero("ped-")).toBeNull();
    expect(idDesdeNumero("12 ana")).toBeNull();
  });
});
