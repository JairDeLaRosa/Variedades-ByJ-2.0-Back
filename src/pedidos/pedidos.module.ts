import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesModule } from "../files/files.module";
import { PedidoItem } from "./pedido-item.entity";
import { Pedido } from "./pedido.entity";
import { PedidosController } from "./pedidos.controller";
import { VentasSistemaController } from "./ventas-sistema.controller";
import { PedidosService } from "./pedidos.service";

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, PedidoItem]), FilesModule],
  controllers: [PedidosController, VentasSistemaController],
  providers: [PedidosService],
})
export class PedidosModule {}
