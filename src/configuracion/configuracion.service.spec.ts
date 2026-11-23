import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfiguracionService } from "./configuracion.service";

const fila = () => ({
  id: 1,
  nombre: "Variedades B&J",
  eslogan: "Papelería & Piñatería",
  descripcion: null,
  nit: null,
  direccion: "Calle 1",
  telefono: "300",
  correo: null,
  horario: null,
  facebook: null,
  instagram: null,
  whatsapp: null,
  cuentaTransferencia: null,
  logoPublicId: "docs/viejo",
  logoUrl: "https://res.cloudinary.com/x/viejo.png",
  updatedAt: new Date("2026-11-23T12:00:00Z"),
});

const logo = { size: 1000 } as Express.Multer.File;

describe("ConfiguracionService", () => {
  const repo = { findOneBy: jest.fn(), save: jest.fn() };
  const files = {
    validarLote: jest.fn(),
    uploadAll: jest.fn(),
    deleteFiles: jest.fn().mockResolvedValue(undefined),
  };
  let service: ConfiguracionService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findOneBy.mockReset().mockResolvedValue(fila());
    repo.save.mockReset().mockImplementation((c: object) => Promise.resolve(c));
    files.uploadAll.mockReset();
    service = new ConfiguracionService(repo as never, files as never);
  });

  it("obtener no expone el publicId del logo", async () => {
    const res = await service.obtener();

    expect(res.logo).toEqual({ url: "https://res.cloudinary.com/x/viejo.png" });
    expect(JSON.stringify(res)).not.toContain("docs/viejo");
  });

  it("obtener responde 404 si falta la fila", async () => {
    repo.findOneBy.mockResolvedValue(null);

    await expect(service.obtener()).rejects.toBeInstanceOf(NotFoundException);
  });

  it("guardar vacía los datos que llegan vacíos y conserva el logo", async () => {
    const res = await service.guardar(
      { nombre: "Nuevo", eslogan: "  ", telefono: "310" },
      [],
    );

    expect(res).toMatchObject({
      nombre: "Nuevo",
      eslogan: null,
      telefono: "310",
    });
    expect(res.logo).not.toBeNull();
    expect(files.uploadAll).not.toHaveBeenCalled();
    expect(files.deleteFiles).not.toHaveBeenCalled();
  });

  it("guardar con un logo nuevo lo sube y borra el anterior después de guardar", async () => {
    files.uploadAll.mockResolvedValue([
      { publicId: "docs/nuevo", url: "https://res.cloudinary.com/x/nuevo.png" },
    ]);

    const res = await service.guardar({ nombre: "Nuevo" }, [logo]);

    expect(res.logo).toEqual({ url: "https://res.cloudinary.com/x/nuevo.png" });
    expect(files.deleteFiles).toHaveBeenCalledWith(["docs/viejo"]);
    expect(repo.save.mock.invocationCallOrder[0]).toBeLessThan(
      files.deleteFiles.mock.invocationCallOrder[0],
    );
  });

  it("guardar con quitarLogo borra el logo", async () => {
    const res = await service.guardar(
      { nombre: "Nuevo", quitarLogo: true },
      [],
    );

    expect(res.logo).toBeNull();
    expect(files.deleteFiles).toHaveBeenCalledWith(["docs/viejo"]);
  });

  it("si la base falla borra el logo recién subido y deja el anterior", async () => {
    files.uploadAll.mockResolvedValue([
      { publicId: "docs/nuevo", url: "https://res.cloudinary.com/x/nuevo.png" },
    ]);
    repo.save.mockRejectedValue(new Error("caída"));

    await expect(service.guardar({ nombre: "Nuevo" }, [logo])).rejects.toThrow(
      "caída",
    );
    expect(files.deleteFiles).toHaveBeenCalledTimes(1);
    expect(files.deleteFiles).toHaveBeenCalledWith(["docs/nuevo"]);
  });

  it("rechaza más de un archivo", async () => {
    await expect(
      service.guardar({ nombre: "Nuevo" }, [logo, logo]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(files.uploadAll).not.toHaveBeenCalled();
  });
});
