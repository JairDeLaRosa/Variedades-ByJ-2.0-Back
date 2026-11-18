---
name: scalability-performance
description: Guía de rendimiento y escalabilidad para consultas TypeORM/PostgreSQL y endpoints NestJS. Úsala al escribir consultas, listados, relaciones, subida de archivos o al sospechar lentitud.
---

# Escalabilidad y rendimiento

**Regla de oro: mide antes de optimizar.** No optimizar prematuramente; sí evitar los problemas conocidos desde el diseño.

## Base de datos (PostgreSQL + TypeORM)

- **N+1.** Al listar productos o salidas con imágenes, cargar la relación en la misma consulta (`relations: ['imagenes']` o `leftJoinAndSelect`), nunca un `find` por fila en un bucle.
- **Índices** según cómo se consulta: `ventas.fecha` (UNIQUE ya indexa), `salidas.fecha` (filtro mensual), `productos.categoria`, FK `producto_id`/`salida_id` en las tablas de imágenes. Crear con migración, no con `synchronize`.
- **Paginación obligatoria** en listados que crecen (`productos`, `salidas`): `page`/`limit` con tope (máx. 100) y respuesta `{ data, total, page, limit }`. `findAll()` sin límite es deuda.
- **Seleccionar solo lo necesario** en listados (`select`), y agregar en la base (`SUM`, `GROUP BY`) en vez de traer filas para sumar en JS.
- **Transacciones** en operaciones multi-tabla (crear salida + sus imágenes, reemplazar imágenes): `DataSource.transaction`/`QueryRunner`.
- **Upsert atómico** para ventas por día: `INSERT … ON CONFLICT (fecha) DO UPDATE`, no `findOne` + `save` (condición de carrera).
- `synchronize: false` siempre fuera de desarrollo local; cambios de esquema por migraciones (skill `database-migrations`).

## Aplicación

- **Async correcto**: `Promise.all` para trabajo independiente (subida de varias imágenes a Cloudinary, ya usado en `files.controller`); secuencial cuando hay dependencia. Nunca `await` dentro de un bucle sobre una lista grande si se puede paralelizar con límite.
- **Caché** solo donde aporte: catálogo de productos y reportes mensuales cerrados (datos que cambian poco). Con TTL y invalidación al escribir. No cachear nada con permisos por usuario sin la clave de usuario.
- **Archivos**: límite de tamaño y de cantidad en Multer; el tráfico de imágenes lo sirve Cloudinary (CDN), no este servidor. Borrado en Cloudinary tolerante a fallos (no bloquear la respuesta por un archivo huérfano; registrar y seguir).
- **Complejidad**: revisar bucles anidados sobre listas; preferir `Map`/`Set` para cruces.
- **Plan gratuito (Render/Neon)**: la instancia se duerme y Neon suspende; el primer request puede tardar. Mantener conexiones con pool pequeño (`extra.max` ≈ 5–10) y reconexión.

## Cuándo NO optimizar

- Tabla con < 10 000 filas y consulta con índice: no hace falta caché ni vistas materializadas.
- Antes de tener un problema medido (`EXPLAIN ANALYZE`, tiempos en logs).
- Si la optimización oscurece el código y el ahorro es de milisegundos.
