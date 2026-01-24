import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type UsuarioDocument = Usuario & Document;

@Schema()
export class Usuario {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  admin: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
