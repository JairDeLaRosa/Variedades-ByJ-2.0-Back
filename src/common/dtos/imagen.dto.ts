import { Matches, MaxLength } from "class-validator";

export class ImagenDto {
  /** Identificador en Cloudinary, dentro de la carpeta `docs`. */
  @Matches(/^docs\/[A-Za-z0-9_-]+$/, { message: "publicId no es válido" })
  publicId: string;

  @Matches(/^https:\/\/res\.cloudinary\.com\//, {
    message: "url debe ser de Cloudinary",
  })
  @MaxLength(500)
  url: string;
}
