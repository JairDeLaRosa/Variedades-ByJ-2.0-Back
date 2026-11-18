---
name: debugging
description: Método para depurar errores y comportamientos inesperados en el backend (reproducir, aislar, hipótesis, evidencia, test de regresión). Úsala cuando algo falla, devuelve un resultado incorrecto o hay un reporte de bug.
---

# Debugging

1. **Reproducir primero.** No arregles lo que no puedes reproducir. Obtén la petición exacta (método, ruta, body, token), el resultado esperado y el real. Si no reproduce, pide más datos (logs, entorno, hora).
2. **Aislar.** Reduce hasta el mínimo caso: ¿falla en el controller, el service o la consulta? Usa un test o `curl`/Swagger con entradas mínimas. Cambia una variable por vez.
3. **Hipótesis explícitas.** Escribe 1–3 causas probables, ordenadas por probabilidad.
4. **Verificar con evidencia**, no con intuición: logs con `Logger`, `EXPLAIN ANALYZE` para consultas, el SQL real que genera TypeORM (`logging: ['query']` en local), inspección de la fila en la base. Descarta cada hipótesis con un dato.
5. **Arreglar la causa raíz**, no el síntoma. Si el síntoma desaparece sin entender por qué, no está arreglado.
6. **Test de regresión.** Escribe el test que falla por el bug y pasa con el fix (skill `testing`).
7. **Limpiar.** Quitar logs y código de depuración temporal. Commit `fix(alcance): …` con el porqué en el cuerpo.

## Pistas frecuentes en este proyecto

- **404 que llega como 500**: un `try/catch` captura la `HttpException` y la relanza como 500 (`salida.service.ts:findOne`).
- **Ventas duplicadas / actualizadas dos veces**: carrera en `findOne` + `save`; usar `ON CONFLICT`.
- **Fecha corrida un día**: conversión de zona horaria con `Date`; los días de negocio deben ser `date` (`YYYY-MM-DD`), sin hora.
- **Números que llegan como string**: falta `@Type(() => Number)` o validador en el DTO.
- **401 inesperado**: token vencido, `SECRET_JWT_SEED` distinto entre entornos, o falta de header `Authorization: Bearer`.
- **Fallos solo en producción**: variable de entorno faltante, CORS, Neon/Render dormidos (primera petición lenta), IP no permitida en la base.
- **Imagen que no se borra**: `publicId` con carpeta (`docs/abc`); el parámetro comodín de la ruta lo trae como arreglo.

## Reglas

- No correr tests, build ni lint salvo que el usuario diga "corre los tests". Si hace falta ejecutar algo para diagnosticar, pedirlo.
- Si tras 2–3 intentos no avanza, parar, resumir lo descartado y preguntar.
