# Common

`src/common/` · Código compartido · [← Índice](./README.md)

| Archivo                   | Contenido                                                                                           | Usado por                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `dtos/imagen.dto.ts`      | `ImagenDto { publicId (docs/...), url (https://res.cloudinary.com/...) }`.                          | [files](./files-cloudinary.md), productos, salidas, configuración |
| `dtos/month-query.dto.ts` | `MonthQueryDto { date: YYYY-MM }` para los `by-month`.                                              | [ventas](./ventas.md), [salidas](./salidas.md)                    |
| `month-range.ts`          | `rangoDelMes("2026-03")` → `{ desde: "2026-03-01", hasta: "2026-04-01" }` (**`hasta` excluyente**). | ventas, salidas                                                   |
| `seguridad.ts`            | Límites de peticiones y `configurarSeguridad` (helmet + `trust proxy`).                             | [arranque](./arranque.md), [auth](./auth.md)                      |

## Seguridad (`seguridad.ts`)

- `LIMITE_GENERAL`: 120 peticiones/min por IP en toda la API. `LIMITE_AUTENTICACION`: 5/min en login y registro.
- `OPCIONES_LIMITE`: se comparte con los tests. Mensaje: «Demasiados intentos. Espera un minuto…».
- `configurarSeguridad(app, { proxysDeConfianza, swaggerActivo })`: fija `trust proxy` (sin él, detrás de Render todos los
  usuarios parecerían la IP del proxy) y activa `helmet`; con Swagger activo se desactiva la CSP porque necesita scripts en línea.

## Regla

Lo que usan dos o más módulos va aquí; lo de un solo módulo se queda en su carpeta. Si añades algo, regístralo en este archivo.

## Historial de cambios

- Sin cambios registrados desde esta documentación.
