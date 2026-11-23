import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesModule } from "../files/files.module";
import { PedidoItem } from "./pedido-item.entity";
import { Pedido } from "./pedido.entity";
import { PedidosController } from "./pedidos.controller";
import { PedidosService } from "./pedidos.service";

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, PedidoItem]), FilesModule],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
