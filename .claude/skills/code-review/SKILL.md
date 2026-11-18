---
name: code-review
description: Checklist y formato para revisar código (propio antes de commitear, o ajeno en un PR) en este backend. Úsala al revisar un diff, al autorrevisar cambios, o cuando el usuario pida /review.
---

# Code review

## Qué revisar (en este orden)

1. **Correctitud** — ¿hace lo que dice el ticket? Casos borde (mes diciembre, listas vacías, `null`), errores que se tragan o cambian de código HTTP, condiciones de carrera (upsert), transacciones faltantes.
2. **Seguridad** — endpoints sin `JwtAuthGuard`, falta de rol admin en escritura/borrado, entrada sin validar, secretos, SQL por concatenación, CORS abierto, datos sensibles en respuestas o logs (nunca devolver `password`).
3. **Rendimiento** — N+1, listados sin paginar, `await` en bucles, falta de índices.
4. **Legibilidad y diseño** — responsabilidades mezcladas, funciones largas, nombres, duplicación real, abstracciones prematuras.
5. **Tests** — ¿hay tests nuevos, cubren error y borde, el bug tiene regresión?
6. **Docs** — Swagger, `.env.example`, CHANGELOG, ADR si hubo decisión.
7. **Contrato** — ¿cambia la API? ¿Está avisado y actualizado el frontend?

## Formato de comentarios

Cada comentario lleva severidad, ubicación `archivo:línea`, el problema y una propuesta:

- **[bloqueante]** — bug, vulnerabilidad, pérdida de datos, ruptura de contrato sin aviso. No se mergea hasta resolver.
- **[sugerencia]** — mejora clara pero no impide el merge.
- **[nit]** — estilo/preferencia menor.

Ejemplo:

> **[bloqueante]** `ventas.controller.ts:42` — `DELETE /ventas/:id` no tiene `JwtAuthGuard`; cualquiera puede borrar ventas. Añadir `@UseGuards(JwtAuthGuard)` y restringir a admin.

Ser específico, explicar el porqué, y reconocer lo que está bien hecho. Revisar el código, no a la persona.

## Autorrevisión antes de commitear

1. `git diff` completo: leerlo como si fuera de otra persona.
2. Pasar la lista de arriba. Buscar restos: `console.log`, código comentado, `any`, TODOs sin ticket, archivos no relacionados.
3. Confirmar que los cambios caben en un solo propósito (si no, dividir en commits).
4. Decir al usuario qué verificaciones **no** se corrieron.
5. Mostrar diff y mensaje de commit antes de commitear.
