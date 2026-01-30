import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type VentaDocument = Venta & Document;

@Schema()
export class Venta {
  @Prop({ required: true })
  fecha: Date;

  @Prop({ required: true, unique: true })
  fechaDia: string; // Para asegurar unicidad por día (formato YYYY-MM-DD)

  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  totalPinateria: number;

  @Prop({ required: true })
  totalPapeleria: number;
}

export const VentaSchema = SchemaFactory.createForClass(Venta);

VentaSchema.set("toJSON", {
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});
