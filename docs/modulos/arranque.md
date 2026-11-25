# Arranque, configuración y health

`src/main.ts`, `src/app.module.ts`, `src/config/env.validation.ts`, `src/health/` · [← Índice](./README.md)

## Arranque (`main.ts`)

1. `configurarSeguridad` ([common](./common.md)): `trust proxy` + `helmet`.
2. Swagger en `/api` solo si `SWAGGER_ENABLED=true` (`addBearerAuth`).
3. `ValidationPipe` global: `whitelist`, `forbidNonWhitelisted` (campo extra → 400) y `transform` (necesario para `@Type`/`@Transform`).
4. CORS con `CORS_ORIGINS` (lista separada por comas).
5. Escucha en `PORT`.

## `AppModule`

`ConfigModule` global (lee `.env.local` y luego `.env`, valida con Joi), `TypeOrmModule.forRootAsync`
([base de datos](./base-de-datos.md)), `ThrottlerModule` con `ThrottlerGuard` como `APP_GUARD` (120/min por IP) y los módulos
de dominio. `HealthController` vive directamente aquí.

## Variables de entorno (`env.validation.ts`)

| Variable                             | Obligatoria | Default / nota                                                 |
| ------------------------------------ | ----------- | -------------------------------------------------------------- |
| `NODE_ENV`                           | no          | `development` (`production`, `test`)                           |
| `PORT`                               | no          | 3000                                                           |
| `DATABASE_URL`                       | **sí**      | URI con pooler                                                 |
| `DATABASE_URL_UNPOOLED`              | no          | conexión directa para migraciones                              |
| `DB_SSL`, `DB_POOL_MAX`              | no          | `true`, 5                                                      |
| `SECRET_JWT_SEED`                    | **sí**      | mínimo 16 caracteres ([auth](./auth.md))                       |
| `CLOUDINARY_NAME/API_KEY/API_SECRET` | **sí**      | [files-cloudinary](./files-cloudinary.md)                      |
| `CORS_ORIGINS`                       | no          | `http://localhost:5173,http://localhost:8080`                  |
| `SWAGGER_ENABLED`                    | no          | `false` (dejar así en producción)                              |
| `TRUST_PROXY`                        | no          | 0 local; en Render, ver `render.yaml` y [DEPLOY](../DEPLOY.md) |

Toda variable nueva se agrega aquí, en `.env.example` y en `render.yaml` si aplica.

## Health (`GET /api/health`)

Responde `{ status: "ok" }`, **sin tocar la BD** a propósito (no despertar a Neon) y con `@SkipThrottle()` (Render lo consulta
de forma periódica). Detalles de despliegue en [DEPLOY](../DEPLOY.md).

## Historial de cambios

- Sin cambios registrados desde esta documentación.
