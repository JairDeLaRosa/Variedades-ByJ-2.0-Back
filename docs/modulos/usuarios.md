# Usuarios

`src/usuarios/` · Ruta base `api/usuarios` · [← Índice](./README.md)

Administración de usuarios existentes: listarlos y cambiarles el rol. **No crea usuarios** (el alta es el registro público
de [auth](./auth.md)).

## Endpoints

| Método | Ruta                    | Permiso                  | Descripción                                     |
| ------ | ----------------------- | ------------------------ | ----------------------------------------------- |
| GET    | `/api/usuarios`         | `usuarios.ver`           | Lista paginada con rol, sin contraseña.         |
| PATCH  | `/api/usuarios/:id/rol` | `usuarios.asignar_roles` | Cambia el rol. Cuerpo `{ rolId }` (entero ≥ 1). |

Query de `GET`: `q` (busca en nombre o email con `ILIKE`, escapando `% _ \`), `rolId`, `pagina`, `limite` (máx. 100, por
defecto 20). Respuesta `{ datos, total, pagina, limite }`, orden `created_at DESC, id DESC`.

## Reglas de `cambiarRol(actor, id, rolId)`

1. Nadie cambia **su propio** rol → 400.
2. Usuario o rol inexistente → 404.
3. Si el rol ya es ese, devuelve el usuario sin tocar nada.
4. `exigirPermisosPropios` dos veces (de [auth](./auth.md)): no se puede **tocar** a alguien con más permisos que uno, ni
   **dar** un rol con permisos que uno no tiene. Impide que alguien con `usuarios.asignar_roles` se escale a admin.
5. Si el usuario es admin y el nuevo rol no, debe quedar **al menos un administrador** → 409.

## Relaciones

- Entidad `Usuario`: definida en [auth](./auth.md) (`auth/entities/usuario.entity.ts`).
- Roles: [roles](./roles.md) (entidad `Rol`; el listado de roles para el selector sale de `GET api/roles`).
- El efecto del cambio es inmediato porque [auth](./auth.md) lee permisos de la BD en cada petición.

## Trampas

- La respuesta de `cambiarRol` devuelve la entidad con `rol` cargado; no incluye `password` (`select: false`).
- El conteo de administradores usa `where: { rol: { clave: "admin" } }`.

## Historial de cambios

- `feat(auth)` Módulo de usuarios: listado con búsqueda y cambio de rol con reglas anti-escalada.
