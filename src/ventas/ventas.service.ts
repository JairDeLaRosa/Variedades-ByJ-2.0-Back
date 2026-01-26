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
      const fecha = new Date(`${createVentaDto.fecha}T00:00:00-05:00`); // Colombia

      if (isNaN(fecha.getTime())) {
        throw new HttpException(
          "La fecha proporcionada no es válida.",
          HttpStatus.BAD_REQUEST,
        );
      }

      const fechaDia = fecha.toLocaleDateString("sv-SE", {
        timeZone: "America/Bogota",
      });

      const existingVenta = await this.ventaModel.findOne({ fechaDia });

      let resDb;
      let msg;

      if (existingVenta) {
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
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    return this.ventaModel
      .find({ fecha: { $gte: start, $lt: end } })
      .sort({ fecha: -1 })
      .exec();
  }
}
