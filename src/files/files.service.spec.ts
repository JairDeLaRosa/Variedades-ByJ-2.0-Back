import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { FilesService } from "./files.service";

const archivo = (size: number) => ({ size }) as Express.Multer.File;
const MB = 1024 * 1024;

type Callback = (error: Error | null, resultado?: unknown) => void;

describe("FilesService", () => {
  const uploader = {
    upload_stream: jest.fn(),
    destroy: jest.fn().mockResolvedValue({ result: "ok" }),
  };
  let service: FilesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FilesService({ uploader } as never);
  });

  describe("validarLote", () => {
    it("acepta hasta 5 archivos que sumen 3 MB", () => {
      expect(() =>
        service.validarLote([archivo(MB), archivo(MB), archivo(MB)], 2),
      ).not.toThrow();
    });

    it("rechaza más de 5 archivos entre conservados y nuevos", () => {
      expect(() => service.validarLote([archivo(1), archivo(1)], 4)).toThrow(
        BadRequestException,
      );
    });

    it("rechaza si los archivos nuevos pesan más de 3 MB en total", () => {
      expect(() =>
        service.validarLote([archivo(2 * MB), archivo(MB + 1)], 0),
      ).toThrow(/3 MB/);
    });
  });

  describe("uploadAll", () => {
    const subidaOk =
      (id: string) => (_opciones: unknown, callback: Callback) => ({
        end: () =>
          callback(null, {
            public_id: `docs/${id}`,
            secure_url: `https://res.cloudinary.com/x/${id}`,
          }),
      });
    const subidaFalla = () => (_opciones: unknown, callback: Callback) => ({
      end: () => callback(new Error("sin red")),
    });

    it("devuelve publicId y url de cada archivo subido", async () => {
      uploader.upload_stream
        .mockImplementationOnce(subidaOk("a"))
        .mockImplementationOnce(subidaOk("b"));

      const res = await service.uploadAll([archivo(1), archivo(1)]);

      expect(res).toEqual([
        { publicId: "docs/a", url: "https://res.cloudinary.com/x/a" },
        { publicId: "docs/b", url: "https://res.cloudinary.com/x/b" },
      ]);
    });

    it("si una subida falla, borra las ya subidas y responde 502", async () => {
      uploader.upload_stream
        .mockImplementationOnce(subidaOk("a"))
        .mockImplementationOnce(subidaFalla());

      await expect(
        service.uploadAll([archivo(1), archivo(1)]),
      ).rejects.toBeInstanceOf(BadGatewayException);
      expect(uploader.destroy).toHaveBeenCalledTimes(1);
      expect(uploader.destroy.mock.calls[0][0]).toBe("docs/a");
    });
  });
});
