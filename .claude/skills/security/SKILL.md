---
name: security
description: Reglas de seguridad para el backend NestJS (OWASP Top 10 aplicado, autenticación, secretos, validación, dependencias). Úsala al tocar auth, guards, endpoints, subida de archivos, variables de entorno, CORS o dependencias.
---

# Seguridad

## Estado actual conocido (corregir al migrar cada módulo)

- Solo `auth` usa `JwtAuthGuard`; `productos`, `salidas`, `ventas` y `files` están **sin guard**.
- `app.enableCors()` sin origen restringido; Swagger público.
- DTOs sin validadores; `ValidationPipe` sin `whitelist`.
- El registro (`POST /api/auth/...`) es público y crea usuarios no admin: el rol admin se asigna a mano en la base.

## OWASP Top 10 aplicado

- **A01 Control de acceso roto**: guard JWT global + decorador `@Public()` para lo abierto (login, registro, catálogo público). `RolesGuard` con `@Roles('admin')` en escritura/borrado. Verificar propiedad del recurso cuando aplique.
- **A02 Fallos criptográficos**: contraseñas con bcrypt (`genSalt(10+)`), nunca devolverlas ni loguearlas (`select: false` en la columna `password_hash`). JWT con expiración corta (`expiresIn`) y secreto largo.
- **A03 Inyección**: solo consultas parametrizadas de TypeORM (`where: { email }`, `:param` en QueryBuilder). Nunca interpolar strings en SQL.
- **A04/A05 Diseño y configuración**: `synchronize: false`, CORS con lista de orígenes (`CORS_ORIGINS`), `helmet`, rate limiting (`@nestjs/throttler`) en login y registro, Swagger desactivado o protegido en producción.
- **A06 Componentes vulnerables**: `npm audit --omit=dev` en CI; quitar dependencias sin uso (`express-validator`, `cors`, `jsonwebtoken` son redundantes con Nest/`@nestjs/jwt`).
- **A07 Autenticación**: mensajes de login genéricos ("credenciales inválidas"), sin revelar si el email existe; bloqueo/limitación de intentos.
- **A08 Integridad**: validar el `publicId` de Cloudinary recibido contra la carpeta esperada antes de guardarlo o borrarlo.
- **A09 Logging**: registrar intentos fallidos y borrados, sin datos sensibles.
- **A10 SSRF**: no hacer requests a URLs aportadas por el usuario.

## Secretos y configuración

- Nunca hardcodear secretos ni commitear `.env`. Variables: `DATABASE_URL`, `SECRET_JWT_SEED`, `CLOUDINARY_*`, `CORS_ORIGINS`, `PORT`.
- Validar variables al arrancar (`ConfigModule` + Joi/zod): si falta una, la app no inicia.
- Si un secreto se filtra: rotarlo de inmediato; limpiarlo del historial no basta.

## Entradas y archivos

- Todo DTO validado; `whitelist` y `forbidNonWhitelisted` activos. IDs con `ParseUUIDPipe`.
- Subidas: solo imágenes (`image/jpeg|png|webp`), tamaño máximo, máximo de archivos, endpoint protegido con guard.
- Respuestas sin campos internos (mapear a DTOs de salida).

## Datos sensibles

Teléfono y email son datos personales: no loguearlos completos, no exponerlos en listados públicos.
