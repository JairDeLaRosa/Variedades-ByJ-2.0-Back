import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SalidaDocument = Salida & Document;

@Schema()
export class Salida {
  @Prop({ required: true })
  fecha: string;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  factura: string;

  @Prop({ required: true })
  tienda: string;

  @Prop({ required: true })
  publicIds: string; // publicIds separados por |

  @Prop({ required: true })
  urls: string; // urls separados por |
}

export const SalidaSchema = SchemaFactory.createForClass(Salida);

SalidaSchema.set("toJSON", {
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});
