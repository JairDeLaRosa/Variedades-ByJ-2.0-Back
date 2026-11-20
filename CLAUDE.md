# Variedades ByJ — Backend

API REST de una tienda de piñatería y papelería: productos, ventas diarias, salidas (compras con factura) y usuarios.
El frontend vive en el repo `Variedades-ByJ-2.0-web`.

## Stack

- NestJS 11 + Express 5, TypeScript 5.9, npm.
- Datos: **PostgreSQL con TypeORM** (Neon en producción), migrado desde MongoDB. Ver `docs/adr/`.
- Auth: Passport JWT + bcryptjs. Archivos: Cloudinary. Docs de la API: Swagger en `/api`.

## Arquitectura

Un módulo por dominio en `src/<dominio>/`: `controller` → `service` → entidad TypeORM, más `dtos/`.
`auth`, `productos`, `salidas`, `ventas`, `reportes`, `files`, `cloudinary`. La lógica va en el service, nunca en el controller.

## Comandos

| Acción     | Comando                                                            |
| ---------- | ------------------------------------------------------------------ |
| Instalar   | `npm install`                                                      |
| Desarrollo | `npm run start:dev`                                                |
| Tests      | `npm test` · cobertura `npm run test:cov` · e2e `npm run test:e2e` |
| Lint       | `npm run lint`                                                     |
| Formato    | `npm run format`                                                   |
| Build      | `npm run build`                                                    |

## Reglas de trabajo

- Leer el código antes de editarlo. Cambios pequeños y enfocados; un propósito por commit.
- Sin código muerto ni código comentado, y sin `console.log` de depuración (usar el `Logger` de Nest).
- No inventar APIs: si no estás seguro de que existe, verifícalo en el código o en la documentación.
- Ante ambigüedad, preguntar.
- Secretos solo por variables de entorno; documentarlas en `.env.example`. Nunca commitear `.env`.
- Fechas: los días de negocio son `date` (`YYYY-MM-DD`); los instantes son `timestamptz` en UTC.
- Imágenes: tablas hijas y `imagenes: [{ publicId, url }]` en la API, nunca strings con `|`.
- Validar toda entrada con DTOs de `class-validator`. Todo endpoint de escritura lleva `JwtAuthGuard`.

## Verificaciones

No correr tests, build ni lint por iniciativa propia: solo cuando el usuario diga "corre los tests".
Prettier sobre archivos tocados sí está permitido. Al terminar un cambio, decir qué quedó sin verificar.
El hook de pre-commit corre el build.

## Git

Trunk-based ligero: `main` protegida, ramas cortas `feature/`, `fix/`, `refactor/`, `docs/`, `chore/` en kebab-case, con PR.
Conventional Commits: `tipo(alcance): descripción` en imperativo. Nunca commit directo a `main`, nunca `push --force`
a ramas compartidas, y mostrar diff y mensaje antes de commitear.

## Skills (`.claude/skills/`, se crean en la Fase 2)

`senior-engineering` (checklist antes de terminar), `testing`, `documentation`, `scalability-performance`,
`code-review`, `security`, `git-workflow`, `refactoring`, `debugging`, `database-migrations`.
