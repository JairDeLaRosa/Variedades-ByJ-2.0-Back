# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Estándares de ingeniería: `CLAUDE.md`, skills, Husky, commitlint, lint-staged y plantillas de PR e issues.
- ADR de la migración de MongoDB a PostgreSQL, y ADR de fechas e imágenes.
- Conexión a PostgreSQL con TypeORM, `data-source` y scripts de migraciones (`migration:generate`, `migration:run`, `migration:revert`).
- Validación de variables de entorno al arrancar (Joi): la app no inicia si falta alguna.
- Facturas de compra (`api/facturas`) con tres modalidades de pago: libre, con plazo (fecha de vencimiento) y a cuotas
  (calendario de cuotas iguales con interés simple en porcentaje). Muestran lo pagado, el saldo y su estado (pendiente,
  parcial, pagada o vencida), con resumen de lo que se debe, lo vencido y lo que vence en 7 días, y un simulador de cuotas.
  Número de factura único. Permisos `facturas.ver`, `facturas.registrar`, `facturas.editar` y `facturas.eliminar`.

### Changed

- Las migraciones se aplican solas en `production` al mergear a `main` (último paso del job `quality` de CI, antes del despliegue
  de Render). Requiere el secreto `DATABASE_URL_UNPOOLED` en GitHub; ver `docs/DEPLOY.md`.
- Las salidas ya no son compras por día: son pagos o abonos de una factura (`facturaId`) o pagos libres con `nota`
  obligatoria, en la fecha que elija el usuario, y no pueden superar el saldo de la factura. **Cambia el contrato de
  `api/salidas`** (`factura` y `tienda` salen de la salida y vienen en `factura: { numero, proveedor, ... }`) y la
  migración `CreateFacturas` convierte las salidas existentes en facturas pagadas; ver `docs/DEPLOY.md`.
- El ranking de tiendas de los reportes toma el proveedor de la factura y agrupa los pagos libres como «Sin factura».
- CORS restringido a los orígenes de `CORS_ORIGINS` (por defecto, los de desarrollo local). **En producción hay que definirla con la URL del frontend.**
- Swagger (`/api`) desactivado por defecto; se activa con `SWAGGER_ENABLED=true`.
- El arranque usa el `Logger` de Nest en lugar de `console.log`.

### Security

- Se actualizaron dependencias con vulnerabilidades conocidas, entre ellas la crítica de `mongoose`.
