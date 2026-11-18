---
description: Documenta el módulo indicado
argument-hint: <módulo o archivo>
---

Documenta: $ARGUMENTS

Sigue la skill `documentation`:

1. Lee el módulo completo antes de escribir.
2. Swagger: `@ApiTags`, `@ApiOperation`, `@ApiResponse` (éxito y errores) y `@ApiProperty({ example })` en los DTOs, con ejemplos reales.
3. JSDoc solo donde la regla de negocio no sea evidente. No comentes lo obvio.
4. README del módulo solo si es complejo.
5. Variables de entorno nuevas en `.env.example`; entrada en `[Unreleased]` de `CHANGELOG.md` si cambia el comportamiento visible.
6. Si hubo una decisión de arquitectura, propón un ADR en `docs/adr/`.
