import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ProductoDocument = Producto & Document;

@Schema()
export class Producto {
  @Prop({ required: true })
  nombre: string;
  @Prop({ required: true })
  precioUnidad: number;
  @Prop({ required: true })
  stock: number;
  @Prop({ required: true })
  descripcion: string;
  @Prop({ required: true })
  categoria: string;
  @Prop({ required: true })
  descuento: number;
  @Prop({ required: true })
  publicIds: string; // publicIds separados por |
  @Prop({ required: true })
  urls: string;
  @Prop({ required: true })
  fecha: string;
}

export const ProductoSchema = SchemaFactory.createForClass(Producto);

ProductoSchema.set("toJSON", {
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});
