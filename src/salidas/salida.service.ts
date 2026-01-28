import { Injectable, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateSalidaDto } from "./dtos/create-salida.dto";
import { Salida, SalidaDocument } from "./salida.schema";

@Injectable()
export class SalidaService {
  constructor(
    @InjectModel(Salida.name) private salidasModel: Model<SalidaDocument>,
  ) {}

  async create(createSalidaDto: CreateSalidaDto) {
    try {
      const { fecha, total, factura, tienda, publicIds, urls } =
        createSalidaDto;

      const nuevaSalida = await this.salidasModel.create({
        fecha,
        total: Number(total),
        factura,
        tienda,
        publicIds,
        urls,
      });

      return nuevaSalida;
    } catch (error) {
      throw new HttpException(
        `Error al crear salida: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    try {
      return await this.salidasModel.find().exec();
    } catch (error) {
      throw new HttpException(
        `Error al buscar salidas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string) {
    try {
      const salida = await this.salidasModel.findById(id).exec();
      if (!salida) {
        throw new HttpException("Salida no encontrada", HttpStatus.NOT_FOUND);
      }
      return salida;
    } catch (error) {
      throw new HttpException(
        `Error al buscar salida: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateSalidaDto: CreateSalidaDto) {
    try {
      const salidasActualizada = await this.salidasModel
        .findByIdAndUpdate(id, updateSalidaDto, { new: true })
        .exec();

      if (!salidasActualizada) {
        throw new HttpException("Salida no encontrada", HttpStatus.NOT_FOUND);
      }

      return salidasActualizada;
    } catch (error) {
      throw new HttpException(
        `Error al actualizar salida: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string) {
    try {
      const salidaEliminada = await this.salidasModel
        .findByIdAndDelete(id)
        .exec();

      if (!salidaEliminada) {
        throw new HttpException("Salida no encontrada", HttpStatus.NOT_FOUND);
      }

      return {
        message: "Salida eliminada correctamente",
        data: salidaEliminada,
      };
    } catch (error) {
      throw new HttpException(
        `Error al eliminar salida: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getByMonth(month: number, year: number): Promise<Salida[]> {
    const m = String(month).padStart(2, "0");
    const start = `${year}-${m}-01`;

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nm = String(nextMonth).padStart(2, "0");
    const end = `${nextYear}-${nm}-01`;

    return this.salidasModel
      .find({ fecha: { $gte: start, $lt: end } })
      .sort({ fecha: -1 })
      .exec();
  }
}
