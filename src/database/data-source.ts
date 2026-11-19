import { config } from "dotenv";
import { DataSource } from "typeorm";

// `neon env pull` escribe .env.local; .env sirve para otros entornos.
config({ path: [".env.local", ".env"] });

// DataSource para la CLI de TypeORM (migraciones). Usa la conexión directa
// (sin pooler), que es la adecuada para DDL. La app usa TypeOrmModule.
export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : true,
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
});
