import { ApiProperty } from "@nestjs/swagger";

export class CreateProductoDto {
  @ApiProperty({ example: "Piñata" })
  nombre: string;

  @ApiProperty({ example: 3000 })
  precioUnidad: number;

  @ApiProperty({ example: 100 })
  stock: number;

  @ApiProperty({ example: "Piñata para fiestas de niña" })
  descripcion: string;

  @ApiProperty({ example: "Piñateria" })
  categoria: string;

  @ApiProperty({ example: 10 })
  descuento: number;

  @ApiProperty({ example: "fwkjfuhgwkjfw" })
  publicIds: string;

  @ApiProperty({ example: "fwkjfuhgwkjfw" })
  urls: string;
}
