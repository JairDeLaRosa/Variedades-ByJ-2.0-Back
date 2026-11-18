---
name: git-workflow
description: Flujo de git del proyecto (trunk-based, Conventional Commits, PRs, versionado, reglas de seguridad). Úsala al crear ramas, commitear, abrir PRs, versionar o cuando el usuario pida commitear.
---

# Git workflow

## Ramas — trunk-based ligero

- `main` es siempre desplegable y está protegida: nada de commits directos.
- Ramas cortas desde `main`, en kebab-case, con ticket si existe: `feature/`, `fix/`, `hotfix/`, `refactor/`, `docs/`, `chore/` (`feature/ventas-por-mes`, `fix/salida-404`).
- Vida corta (días, no semanas); PR pequeño hacia `main`; squash o rebase para historia lineal.
- Diferencia con Git Flow: no hay `develop`; se integra continuamente a `main`. Si algún día hay varios desarrolladores o un entorno de staging, se añade `develop`.

## Conventional Commits

`tipo(alcance): descripción` en imperativo, minúscula, sin punto, ≤ 72 caracteres.
Tipos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
Alcance = módulo: `auth`, `ventas`, `salidas`, `productos`, `files`, `db`.

```
fix(salidas): devolver 404 cuando la salida no existe

El try/catch convertía NotFoundException en 500.
```

- Commits **atómicos**: un propósito cada uno; refactor separado de cambios de comportamiento.
- El cuerpo explica el **porqué** cuando no es obvio.
- Cambio incompatible: `feat(api)!: ...` y pie `BREAKING CHANGE: <qué y cómo migrar>`.

## Validación automática

- `pre-commit` (Husky + lint-staged): Prettier y ESLint sobre archivos modificados, y el build (así está acordado).
- `commit-msg` (commitlint): rechaza mensajes que no sean Conventional Commits.
- CI en cada PR: lint, type-check, tests con cobertura, build y `npm audit`.

## Pull requests

Plantilla en `.github/pull_request_template.md`: qué cambia, por qué, cómo probarlo, checklist (tests, docs, sin secretos, auto-revisión). Un PR = un propósito; descripción generada a partir de los commits.

## Versionado

SemVer. `CHANGELOG.md` en Keep a Changelog, generado/actualizado a partir de los commits (`feat` → minor, `fix` → patch, `!`/BREAKING → major).

## Reglas duras para Claude

- Nunca commit directo a `main`; nunca `push --force` a ramas compartidas; nunca `--no-verify`.
- No commitear sin que el usuario lo pida ("commitea"), ni sin que lo verifiquen los hooks.
- Mostrar `git diff` y el mensaje propuesto **antes** de commitear.
- Nunca incluir archivos sensibles: `.env*`, credenciales, llaves, dumps de base de datos. Revisar `git status` antes de `git add`; añadir por nombre, no con `git add -A`.
- Terminar los mensajes de commit con la línea de coautoría que indique el entorno.
