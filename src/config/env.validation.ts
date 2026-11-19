import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().port().default(3000),

  // Base de datos actual (MongoDB). Se elimina al terminar la migración.
  DB_CONECT: Joi.string().required(),

  // Base de datos nueva (PostgreSQL).
  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_URL_UNPOOLED: Joi.string().uri(),
  DB_SSL: Joi.boolean().default(true),
  DB_POOL_MAX: Joi.number().integer().min(1).default(5),

  SECRET_JWT_SEED: Joi.string().min(16).required(),

  CLOUDINARY_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  CORS_ORIGINS: Joi.string().default(
    "http://localhost:5173,http://localhost:8080",
  ),
  SWAGGER_ENABLED: Joi.boolean().default(false),
});
