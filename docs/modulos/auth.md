# Auth

`src/auth/` · Ruta base `api/auth` · [← Índice](./README.md)

Autenticación con JWT (Passport) y **autorización por permisos**. Es el módulo del que depende el resto: define el
decorador `@Autorizar`, el catálogo de permisos y la entidad `Usuario`.

## Archivos

| Archivo                                   | Función                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `auth.controller.ts`                      | `POST /`, `POST /new`, `GET /renew`.                                              |
| `auth.service.ts`                         | Registro, login, renovación y firma del JWT.                                      |
| `entities/usuario.entity.ts`              | Tabla `usuarios`. `password` tiene `select: false`.                               |
| `strategies/jwt.strategy.ts`              | Valida el token y arma el `AuthUser` leyendo la BD.                               |
| `guards/jwt-auth.guard.ts`                | `AuthGuard("jwt")`.                                                               |
| `guards/permisos.guard.ts`                | Exige alguno de los permisos declarados; el admin pasa siempre.                   |
| `autorizar.decorator.ts`                  | `@Autorizar(...permisos)` = `JwtAuthGuard` + `PermisosGuard` + metadata.          |
| `decorators.ts`                           | `@CurrentUser()` inyecta `request.user` (`AuthUser`).                             |
| `auth-user.interface.ts`                  | `AuthUser { uid, name, rolId, rolNombre, esAdmin, permisos }`.                    |
| `permisos.ts`                             | Enum `Permiso`, `CATALOGO_PERMISOS` (agrupado por módulo) y `TODOS_LOS_PERMISOS`. |
| `permisos-usuario.ts`                     | `permisosDeRol`, `construirAuthUser`, `exigirPermisosPropios`.                    |
| `dtos/login.dto.ts`, `create-user.dto.ts` | `email` + `password` (mín. 6); registro suma `name` y `phone`.                    |

## Endpoints

| Método | Ruta              | Acceso       | Throttle     | Descripción                                                       |
| ------ | ----------------- | ------------ | ------------ | ----------------------------------------------------------------- |
| POST   | `/api/auth`       | público      | 5/min por IP | Login. Devuelve `{ ok, msg, user, token }`.                       |
| POST   | `/api/auth/new`   | público      | 5/min por IP | Registro de cliente. Devuelve `{ ok, id, name, token }`.          |
| GET    | `/api/auth/renew` | sesión (JWT) | general      | Token nuevo + datos vigentes del usuario (`{ ok, token, user }`). |

`user` (login y renew) = `{ id, name, phone, email, rol: { id, nombre, clave }, permisos: Permiso[], admin }`.
El campo `admin` está **obsoleto** y solo existe por compatibilidad con versiones anteriores de la web.

## Cómo funciona la autorización

1. El token (HS256, vence en **2 h**, secreto `SECRET_JWT_SEED`) lleva `{ uid, name, admin }`. Solo identifica.
2. En **cada petición** `JwtStrategy.validate` busca al usuario con su rol y permisos en la BD y construye el `AuthUser`.
   Consecuencias: un cambio de rol vale al instante con el mismo token; si borran al usuario, el token deja de servir (401).
3. `PermisosGuard` lee la metadata de `@Autorizar` (método o clase). Basta **uno** de los permisos listados. Sin permisos
   listados = solo sesión. Sin permiso → `403 "No tienes permiso para esta acción."`.
4. El rol con `clave = "admin"` recibe **todos** los permisos del enum (incluidos los futuros) sin filas en `rol_permisos`.
5. Un permiso guardado en BD que ya no existe en el enum se **ignora** (no falla).

## Reglas de negocio

- **Registro**: el email se normaliza (`trim` + minúsculas); si ya existe → 409. El rol asignado es **siempre** `cliente`
  (nunca viene del navegador); si falta ese rol sembrado → 500. Contraseña con `bcryptjs` (10 rondas). Carrera de dos
  registros iguales: gana el índice único y se responde 409.
- **Login**: mismo mensaje (`Credenciales inválidas.`, 401) para email inexistente y contraseña errónea.
- **Escalada de privilegios** (`exigirPermisosPropios`): nadie puede dar ni tocar permisos que no tiene (salvo admin).
  La usan [roles](./roles.md) y [usuarios](./usuarios.md).

## Catálogo de permisos (`Permiso`)

Formato `modulo.accion`. Agrupados como los muestra la pantalla de roles (`GET api/roles/permisos`):

| Grupo         | Permisos                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------- |
| dashboard     | `dashboard.ver`                                                                          |
| productos     | `productos.ver/crear/editar/eliminar`                                                    |
| inventario    | `inventario.ver`, `inventario.ajustar`                                                   |
| pedidos       | `pedidos.ver`, `pedidos.gestionar`                                                       |
| ventas        | `ventas.ver`, `ventas.registrar`, `ventas.comprobante`, `ventas.anular` (_próximamente_) |
| clientes      | `clientes.ver` (la pantalla muestra datos de ejemplo)                                    |
| cierres       | `cierres.ver/registrar/eliminar`                                                         |
| salidas       | `salidas.ver/registrar/editar/eliminar`                                                  |
| facturas      | `facturas.ver/registrar/editar/eliminar`                                                 |
| reportes      | `reportes.ver`                                                                           |
| usuarios      | `usuarios.ver`, `usuarios.asignar_roles`                                                 |
| configuracion | `configuracion.editar`                                                                   |
| roles         | `roles.ver/crear/editar/eliminar`                                                        |

**Agregar un permiso nuevo**: (1) valor en el enum, (2) entrada en `CATALOGO_PERMISOS` con etiqueta (y `nota` si hace falta),
(3) `@Autorizar(Permiso.X)` en el endpoint, (4) el Administrador lo recibe solo; a los demás roles hay que dárselo desde
la pantalla de roles o con una migración. Qué permiso protege cada endpoint: ver la tabla de cada módulo.

## Modelo de datos

`usuarios`: `id`, `name`, `email` (único), `phone`, `password` (hash, `select: false`), `rol_id` → [`roles`](./roles.md)
(`ON DELETE RESTRICT`, índice `IDX_usuarios_rol`), `created_at`. Detalle en [base de datos](./base-de-datos.md).

## Relaciones

- Usa la entidad `Rol` de [roles](./roles.md) para el registro y para cargar permisos.
- [roles](./roles.md) y [usuarios](./usuarios.md) importan `permisosDeRol` / `exigirPermisosPropios`.
- [pedidos](./pedidos.md) importa `Usuario` para guardar nombre y teléfono del cliente en cada pedido.
- Todos los controladores protegidos importan `Autorizar`, `Permiso` y (a veces) `CurrentUser`.
- Límites de login/registro: constante `LIMITE_AUTENTICACION` en [common](./common.md).

## Trampas

- `Usuario.password` no se trae salvo con `select` explícito (el login lo hace). Nunca exponerlo en respuestas.
- `GET /renew` solo usa `JwtAuthGuard` (no `@Autorizar`): cualquier sesión válida puede renovar.
- Cambiar el nombre/rol en BD no invalida el token, pero **sí** cambia lo que el servidor cree de él en la siguiente petición.
- Los tests existentes: `permisos.guard.spec.ts`, `jwt.strategy.spec.ts` (y de servicio) documentan el comportamiento esperado.

## Historial de cambios

- `feat(auth)` Roles con permisos y módulo de usuarios: reemplaza el flag `admin` (obsoleto en las respuestas).
- Permisos `facturas.ver/registrar/editar/eliminar` añadidos al catálogo; el grupo de salidas pasa a llamarse «Salidas (pagos y abonos)». Los roles que no son Administrador no los reciben solos.
