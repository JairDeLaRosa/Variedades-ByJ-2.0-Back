---
description: Genera la descripción del PR a partir de los commits de la rama
---

Genera la descripción del pull request de la rama actual.

1. Averigua la rama base (`main`) y lista los commits propios con `git log main..HEAD --oneline` y el diff con `git diff main...HEAD --stat`.
2. Redacta la descripción usando `.github/pull_request_template.md`: qué cambia, por qué, cómo probarlo, impacto en API y base de datos, checklist.
3. Marca en el checklist solo lo que realmente se hizo; lo que no, déjalo sin marcar y menciónalo.
4. Propón el título como Conventional Commit (`tipo(alcance): descripción`).
5. Muestra el texto al usuario. No abras el PR ni hagas `push` sin su autorización.

Contexto adicional: $ARGUMENTS
