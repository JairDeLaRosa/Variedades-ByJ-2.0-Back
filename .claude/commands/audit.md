---
description: Auditoría de seguridad y dependencias
---

Audita el proyecto con la skill `security`.

1. **Código**: controladores y endpoints sin `JwtAuthGuard` o sin rol, DTOs sin validación, CORS, Swagger expuesto, secretos hardcodeados, `console.log` con datos sensibles, consultas armadas con strings, subida de archivos sin límites.
2. **Dependencias**: pide al usuario autorización y luego ejecuta `npm audit --omit=dev`. Revisa también paquetes sin uso (`express-validator`, `cors`, `jsonwebtoken`, `swagger-ui-express`) comprobando con búsqueda que no se importan.
3. **Configuración**: `.gitignore`, `.env.example`, variables validadas al arrancar.
4. Entrega los hallazgos por severidad (crítico, alto, medio, bajo) con `archivo:línea`, impacto y corrección propuesta.
5. No corrijas nada sin que el usuario lo apruebe: cada corrección va en su propia rama.

Alcance: $ARGUMENTS
