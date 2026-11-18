---
description: Analiza el diff y propone commits atómicos con Conventional Commits
---

Prepara los commits siguiendo la skill `git-workflow`.

1. Confirma que no estás en `main`; si lo estás, propón la rama (`feature/`, `fix/`, `refactor/`, `docs/`, `chore/`) y no commitees.
2. Revisa `git status` y `git diff`. Detecta archivos sensibles (`.env*`, credenciales, llaves, dumps) y avisa sin añadirlos.
3. Agrupa los cambios en commits **atómicos**: un propósito cada uno; el refactor separado de los cambios de comportamiento.
4. Para cada commit muestra: archivos incluidos y mensaje `tipo(alcance): descripción` (imperativo, ≤ 72 caracteres, cuerpo con el porqué si no es obvio, `BREAKING CHANGE` si aplica).
5. **Espera la aprobación del usuario** antes de ejecutar `git add` por nombre de archivo y `git commit`. Nunca `git add -A`, nunca `--no-verify`.
6. Termina cada mensaje con la línea de coautoría que indique el entorno.

Notas adicionales del usuario: $ARGUMENTS
