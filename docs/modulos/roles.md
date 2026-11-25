# Roles

`src/roles/` · Ruta base `api/roles` · [← Índice](./README.md)

Roles configurables. Cada rol es una fila con un conjunto de permisos (tabla hija `rol_permisos`). Los **permisos viven
en el código** ([`auth/permisos.ts`](./auth.md#catálogo-de-permisos-permiso)); la BD solo guarda cuáles tiene cada rol.

## Endpoints

| Método | Ruta                  | Permiso (basta uno)                         | Descripción                                             |
| ------ | --------------------- | ------------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/roles`          | `roles.ver` o `usuarios.asignar_roles`      | Lista roles con sus permisos y cuántos usuarios tienen. |
| GET    | `/api/roles/permisos` | `roles.ver`, `roles.crear` o `roles.editar` | Catálogo de permisos agrupado por módulo.               |
| POST   | `/api/roles`          | `roles.crear`                               | Crea un rol (`clave = null`).                           |
| PUT    | `/api/roles/:id`      | `roles.editar`                              | Reemplaza nombre, descripción y permisos.               |
| DELETE | `/api/roles/:id`      | `roles.eliminar`                            | 204. Solo roles sin usuarios y que no sean del sistema. |

`GET /api/roles` admite también `usuarios.asignar_roles` porque la lista de [usuarios](./usuarios.md) necesita elegir rol.

Cuerpo de `POST`/`PUT` (`GuardarRolDto`): `nombre` (1–50, recortado), `descripcion?` (≤200), `permisos: Permiso[]`
(únicos, todos del enum). Respuesta (`RolDetalle`): `{ id, nombre, descripcion, clave, permisos, usuarios }`.

## Reglas de negocio

- **Roles del sistema** (`clave` = `admin` | `cliente`): no se editan ni borran (`400 "Los roles del sistema no se pueden modificar."`).
  `admin` siempre tiene todos los permisos sin filas; `cliente` es el rol del registro público y no entra al panel.
- **Nombre único sin distinguir mayúsculas** (índice `UQ_roles_nombre` sobre `lower(nombre)`); duplicado → 409
  (también cuando ganan dos peticiones simultáneas por `23505`).
- **Sin escalada**: al crear, todos los permisos deben ser del actor; al editar, solo los permisos **agregados** (los que ya
  estaban o los que se quitan no cuentan). Usa `exigirPermisosPropios` de [auth](./auth.md). Falla con 403.
- **Eliminar**: 409 si hay usuarios con ese rol (`"Tiene N usuario(s). Cámbiales el rol antes de eliminarlo."`).
- **Actualizar permisos**: los que ya estaban conservan su fila; los quitados se borran (`orphanedRowAction: "delete"`).

## Modelo de datos

- `roles`: `id`, `nombre` (varchar 50), `descripcion` (text, default `''`), `clave` (varchar 20, único, nullable), `created_at`.
- `rol_permisos`: PK compuesta `(rol_id, permiso)`; `rol_id` → `roles` `ON DELETE CASCADE`.
- **Sembrado** (migración `RolesYPermisos`): `Administrador` (`admin`), `Cliente` (`cliente`) y `Vendedor` (sin clave) con
  `productos.ver`, `pedidos.ver/gestionar`, `ventas.ver/registrar/comprobante`, `clientes.ver`.
  Los usuarios previos pasaron a `admin` o `cliente` según su antiguo flag `admin`. Ver [base de datos](./base-de-datos.md).

## Relaciones

- Depende de [auth](./auth.md): `Permiso`, `CATALOGO_PERMISOS`, `permisosDeRol`, `exigirPermisosPropios`, entidad `Usuario`.
- [usuarios](./usuarios.md) cambia el rol de un usuario usando estos roles.
- [auth](./auth.md) busca el rol `cliente` en el registro.

## Trampas

- El módulo no exporta nada; otros módulos acceden a `Rol` registrándolo con `TypeOrmModule.forFeature`.
- Al añadir un permiso al enum, los roles personalizados **no** lo reciben solos.

## Historial de cambios

- `feat(auth)` Roles con permisos (migración `RolesYPermisos`): Administrador, Cliente y Vendedor sembrados.
