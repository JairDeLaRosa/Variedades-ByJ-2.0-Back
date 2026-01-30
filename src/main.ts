import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as dotenv from "dotenv";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle("API Variedades ByJ")
    .setDescription("Documentación de la API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  await app.listen(process.env.PORT || 3000);
  console.log(`Servidor corriendo en el puerto ${process.env.PORT || 3000}`);
}
bootstrap();
