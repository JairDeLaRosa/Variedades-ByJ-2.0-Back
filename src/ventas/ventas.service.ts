import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Venta, VentaDocument } from "./ventas.schema";
import { CreateVentaDto, ResponseCreateRPT } from "./dtos/create-venta.dto";

@Injectable()
export class VentasService {
  constructor(
    @InjectModel(Venta.name) private ventaModel: Model<VentaDocument>,
  ) {}

  async create(createVentaDto: CreateVentaDto): Promise<ResponseCreateRPT> {
    try {
      const fecha = new Date(createVentaDto.fecha);
      if (isNaN(fecha.getTime())) {
        throw new HttpException(
          "La fecha proporcionada no es válida.",
          HttpStatus.BAD_REQUEST,
        );
      }
      const fechaDia = fecha.toISOString().split("T")[0];

      const existingVenta = await this.ventaModel.findOne({ fechaDia });
      let resDb;
      let msg;
      if (existingVenta) {
        // Update existing
        const updateData = {
          ...createVentaDto,
          fecha,
          fechaDia,
        };
        resDb = await this.ventaModel.findByIdAndUpdate(
          existingVenta._id,
          updateData,
          { new: true },
        );
        msg = "Registro actualizado.";
      } else {
        // Create new
        const venta = new this.ventaModel({
          ...createVentaDto,
          fecha,
          fechaDia,
        });
        resDb = await venta.save();
        msg = "Registro creado.";
      }
      return {
        data: resDb,
        ok: true,
        msg,
      };
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<Venta[]> {
    return this.ventaModel.find().exec();
  }

  async findOne(id: string): Promise<Venta> {
    return this.ventaModel.findById(id).exec();
  }

  async remove(id: string): Promise<void> {
    await this.ventaModel.findByIdAndDelete(id).exec();
  }

  async getByMonth(month: number, year: number): Promise<Venta[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return this.ventaModel
      .find({ fecha: { $gte: start, $lt: end } })
      .sort({ fecha: -1 })
      .exec();
  }
}
