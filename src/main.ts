import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  if (config.get<boolean>("SWAGGER_ENABLED")) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("API Variedades ByJ")
      .setDescription("Documentación de la API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    SwaggerModule.setup(
      "api",
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      // Necesario para que `@Type` y `@Transform` lleguen al service.
      transform: true,
    }),
  );
  app.enableCors({
    origin: config
      .get<string>("CORS_ORIGINS")
      .split(",")
      .map((origin) => origin.trim()),
  });

  const port = config.get<number>("PORT");
  await app.listen(port);
  new Logger("Bootstrap").log(`Servidor corriendo en el puerto ${port}`);
}
bootstrap();
