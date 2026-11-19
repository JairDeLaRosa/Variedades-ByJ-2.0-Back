import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

// La app usa DATABASE_URL (conexión con pooler de Neon). Las migraciones usan
// DATABASE_URL_UNPOOLED desde data-source.ts.
export const typeOrmConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: "postgres",
  url: config.get<string>("DATABASE_URL"),
  ssl: config.get<boolean>("DB_SSL"),
  autoLoadEntities: true,
  synchronize: false,
  extra: { max: config.get<number>("DB_POOL_MAX") },
});
