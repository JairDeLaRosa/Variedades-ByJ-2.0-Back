---
name: testing
description: Cómo escribir tests (Jest + @nestjs/testing + supertest) en este backend. Úsala al crear o modificar lógica, al pedir tests, al corregir un bug (test de regresión) o al decidir qué probar.
---

# Testing

El proyecto hoy tiene **0 tests**. Cada cambio nuevo debe aportar los suyos.

## Reglas para Claude

- **No correr** `jest` por iniciativa propia: solo cuando el usuario diga "corre los tests". Escribir los tests sí es parte de la tarea; al terminar, decir que quedaron sin ejecutar.

## Pirámide

1. **Unitarios (mayoría)** — services con repositorios mockeados. Rápidos, sin base de datos.
2. **Integración** — service + TypeORM contra Postgres real (contenedor/Neon branch de test) para consultas, constraints y transacciones. Obligatorio para: upsert de ventas, borrado en cascada de imágenes, filtros por mes.
3. **e2e (pocos)** — `supertest` sobre la app: flujo auth → crear → listar → borrar, y que sin token devuelva 401.

## Convenciones

- Ubicación: `*.spec.ts` junto al archivo (`ventas.service.spec.ts`); e2e en `test/*.e2e-spec.ts`.
- Nombres: `describe('VentasService')` → `it('actualiza la venta existente cuando ya hay una para ese día')`. Describen comportamiento, no implementación.
- Patrón **AAA**: Arrange / Act / Assert separados por línea en blanco.
- **Mocks solo en fronteras externas**: Cloudinary, reloj (`jest.useFakeTimers`), HTTP saliente. No mockear lo que puedes ejecutar de verdad (DTO + `ValidationPipe`, helpers puros).
- Repositorios: `getRepositoryToken(Entidad)` con un objeto parcial tipado, no `as any`.
- Datos de prueba con funciones fábrica (`crearVenta({ fecha: '2026-03-01' })`), sin fixtures gigantes.

## Qué cubrir siempre

- Camino feliz **y** al menos un caso de error por método: no existe (404), entrada inválida (400), sin token (401), no admin (403).
- Casos borde del dominio: cambio de mes/año en `getByMonth` (diciembre → enero), venta duplicada el mismo día (upsert), `stock` que no puede quedar negativo, salida sin imágenes, email de usuario repetido.
- **Bug corregido ⇒ test de regresión** que falla antes del fix.

## TDD

Úsalo para lógica con reglas (cálculos de totales, upsert, validaciones de fecha). No lo fuerces en CRUD trivial.

## Cobertura

Objetivo inicial **40 %** global (hay cero base), subir 10 puntos por trimestre hasta **80 %** en `services/`. El umbral de CI se sube solo cuando se alcanza; nunca se baja.
