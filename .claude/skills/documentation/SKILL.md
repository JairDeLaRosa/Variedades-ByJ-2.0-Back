---
name: documentation
description: Estándares de documentación del backend (JSDoc, Swagger/OpenAPI, README, ADRs, CHANGELOG). Úsala al crear o cambiar endpoints, módulos, variables de entorno o tomar decisiones de arquitectura.
---

# Documentación

## Qué documentar y dónde

- **API pública = Swagger.** Cada controller con `@ApiTags`; cada DTO con `@ApiProperty({ example })`; cada endpoint con `@ApiOperation` y `@ApiResponse` (éxito y errores 400/401/403/404). Los endpoints protegidos con `@ApiBearerAuth()`. Swagger es la fuente de verdad del contrato con el frontend.
- **JSDoc** solo en lo no obvio: reglas de negocio de un service (`/** Crea o reemplaza la venta del día: una fila por fecha. */`), helpers compartidos, decisiones de zona horaria. No comentar lo que el código ya dice.
- **README raíz**: qué es, requisitos, instalación, variables de entorno (tabla), comandos, cómo correr migraciones, despliegue.
- **README por módulo** solo si el módulo es complejo (ej. `files/` con las reglas de Cloudinary).
- **`.env.example`**: toda variable nueva se agrega aquí con un comentario y un valor de ejemplo no sensible.

## ADRs (`docs/adr/NNNN-titulo-en-kebab.md`)

Una decisión importante = un ADR corto, inmutable (se reemplaza con otro ADR, no se edita). Plantilla:

```
# NNNN. Título
Estado: propuesto | aceptado | reemplazado por NNNN
## Contexto
## Decisión
## Consecuencias
```

ADRs ya justificados en este proyecto: `0001-migrar-de-mongodb-a-postgresql`, `0002-fechas-como-date-y-timestamptz`, `0003-imagenes-en-tablas-hijas`.

## CHANGELOG

`CHANGELOG.md` en formato **Keep a Changelog** (`Added`, `Changed`, `Fixed`, `Removed`, `Security`) con sección `[Unreleased]`. Se actualiza en cada PR que cambie comportamiento visible; el cambio de contrato (breaking) se marca explícitamente. Versionado SemVer.

## Antes de terminar

- [ ] Swagger refleja el contrato real (ejemplos reales, errores documentados).
- [ ] `.env.example` y README al día.
- [ ] ADR si hubo una decisión que alguien preguntará "¿por qué?" en seis meses.
- [ ] Entrada en `[Unreleased]` del CHANGELOG.
