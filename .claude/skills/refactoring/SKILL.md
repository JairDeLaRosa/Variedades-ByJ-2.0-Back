---
name: refactoring
description: Cómo refactorizar de forma segura en este backend (tests primero, pasos pequeños, sin mezclar con cambios de comportamiento). Úsala al reestructurar código, limpiar duplicación o migrar un módulo de Mongoose a TypeORM.
---

# Refactorización segura

Refactorizar = cambiar la estructura **sin** cambiar el comportamiento observable.

## Proceso

1. **Red de seguridad primero.** Si el código no tiene tests (hoy casi todo), escribe tests de caracterización que fijen el comportamiento actual (incluidos los bugs que se mantienen a propósito) antes de tocar nada.
2. **Pasos pequeños.** Un movimiento por vez (extraer método, renombrar, mover archivo); cada paso deja el código compilando y los tests en verde.
3. **Un commit por paso lógico** y **nunca mezclar** refactor con cambio de comportamiento: `refactor(ventas): extraer helper de rango mensual` y `fix(ventas): …` van separados.
4. **Comparar antes y después**: mismas entradas, mismas respuestas (status, forma del JSON).
5. **Sin código muerto al terminar**: borrar lo que quedó sin uso, no comentarlo.

## Candidatos reales de este repo

- Lógica de rango mensual duplicada en `ventas.service` y `salida.service` → helper compartido.
- `try/catch` que envuelve errores HTTP → quitar el wrapper, dejar que Nest maneje las excepciones.
- ~80 líneas comentadas en `producto.service.ts` → eliminar.
- DTOs sin validación y `Number(x)` en servicios → mover a `class-validator` + `@Type(() => Number)`.
- Respuestas de Mongoose con `toJSON` transform → DTOs de salida explícitos.

## Migración Mongoose → TypeORM (módulo a módulo)

1. Tests del contrato HTTP actual del módulo.
2. Entidad TypeORM + migración.
3. Reescribir el service sobre `Repository`, manteniendo (o cambiando de forma deliberada y documentada) la forma de la respuesta.
4. Actualizar el frontend si cambió el contrato, en el mismo trabajo.
5. Quitar el schema de Mongoose y su import en el módulo.

## Cuándo parar

Si descubres un bug mientras refactorizas, anótalo y arréglalo en un commit aparte (skill `debugging`). Si el refactor crece más allá de lo pedido, detente y consulta.
