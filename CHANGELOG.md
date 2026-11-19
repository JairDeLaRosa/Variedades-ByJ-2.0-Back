# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Estándares de ingeniería: `CLAUDE.md`, skills, Husky, commitlint, lint-staged y plantillas de PR e issues.
- ADR de la migración de MongoDB a PostgreSQL, y ADR de fechas e imágenes.
- Conexión a PostgreSQL con TypeORM, `data-source` y scripts de migraciones (`migration:generate`, `migration:run`, `migration:revert`).
- Validación de variables de entorno al arrancar (Joi): la app no inicia si falta alguna.

### Changed

- CORS restringido a los orígenes de `CORS_ORIGINS` (por defecto, los de desarrollo local). **En producción hay que definirla con la URL del frontend.**
- Swagger (`/api`) desactivado por defecto; se activa con `SWAGGER_ENABLED=true`.
- El arranque usa el `Logger` de Nest en lugar de `console.log`.

### Security

- Se actualizaron dependencias con vulnerabilidades conocidas, entre ellas la crítica de `mongoose`.
