---
description: Revisa los cambios actuales (git diff) con la skill code-review
---

Revisa los cambios actuales usando la skill `code-review`.

1. Obtén el diff con `git diff` y `git diff --staged`; si hay archivos nuevos sin seguimiento, léelos.
2. Si el usuario indicó un alcance, limita la revisión a: $ARGUMENTS
3. Aplica el checklist en orden: correctitud, seguridad, rendimiento, legibilidad, tests, docs, contrato.
4. Entrega los comentarios con severidad `[bloqueante]`, `[sugerencia]` o `[nit]`, cada uno con `archivo:línea`, el problema y una propuesta.
5. Cierra con un veredicto (aprobar / cambios requeridos) y la lista de verificaciones que no se corrieron.

No modifiques archivos ni ejecutes tests, build o lint.
