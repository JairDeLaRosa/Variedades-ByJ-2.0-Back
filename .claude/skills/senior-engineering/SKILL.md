---
name: senior-engineering
description: Principios y checklist de calidad para escribir o modificar código del backend NestJS. Úsala al implementar una funcionalidad, un endpoint, un service o una entidad, y SIEMPRE antes de dar una tarea por terminada.
---

# Ingeniería senior en este backend

## Principios

- **Responsabilidad única.** El controller recibe y responde HTTP, el service contiene la lógica, el repositorio/entidad accede a datos. Si un service mezcla reglas de negocio con armado de respuestas HTTP, sepáralos.
- **KISS / YAGNI.** No crear abstracciones para un solo uso. No dejar métodos "por si acaso" (en `producto.service.ts` había ~80 líneas comentadas copiadas de salidas: eso es lo que no se hace).
- **DRY con criterio.** La lógica de rango mensual está duplicada en `ventas` y `salidas`: extrae un helper cuando haya tres usos, no antes.
- **Errores explícitos.** Lanzar excepciones HTTP específicas (`NotFoundException`, `BadRequestException`). No envolver todo en un `try/catch` que convierte un 404 en 500 (bug real en `salida.service.ts:findOne`). Captura solo cuando puedas aportar contexto o recuperarte.
- **Tipado estricto.** Sin `any`. Los DTOs y las entidades son los contratos; los `Number(x)` en servicios indican que falta validar/transformar en el DTO.
- **Validar en la frontera.** Todo DTO lleva decoradores de `class-validator` (`@IsString`, `@IsInt`, `@Min`, `@IsDateString`…). `ValidationPipe` con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- **Inmutabilidad.** No mutar parámetros ni entidades recibidas; construir objetos nuevos.
- **Nombres claros.** Dominio en español como el resto del código (`precioUnidad`, `totalPinateria`); verbos en métodos (`findByMonth`, no `getByMonth` mezclado con `find*`).
- **Funciones pequeñas.** Si necesitas un comentario para separar secciones dentro de un método, extrae métodos.

## Convenciones del proyecto

- Fechas de negocio: `date` (`YYYY-MM-DD`). Instantes: `timestamptz` UTC.
- Dinero: enteros en pesos (COP no usa decimales).
- Imágenes: relación 1:N con tabla hija; la API expone `imagenes: [{ publicId, url }]`.
- IDs: enteros autoincrementales (`serial`), expuestos como `id` numérico.
- Logs con `Logger` de Nest, nunca `console.log`.

## Checklist antes de dar por terminada una tarea

- [ ] Hace exactamente lo pedido, sin cambios de comportamiento colaterales.
- [ ] DTOs validados; sin `any` nuevos; sin código muerto ni comentado ni `console.log`.
- [ ] Errores con la excepción HTTP correcta y mensajes útiles.
- [ ] Endpoints de escritura/borrado protegidos con `JwtAuthGuard` (y rol admin si aplica).
- [ ] Sin secretos hardcodeados; variables nuevas en `.env.example`.
- [ ] Tests nuevos o actualizados (ver skill `testing`); casos borde y de error cubiertos.
- [ ] Swagger actualizado (`@ApiProperty`, `@ApiResponse`) y docs si cambió el contrato.
- [ ] Prettier aplicado a los archivos tocados.
- [ ] Informé qué quedó **sin verificar** (no correr tests/build/lint salvo que el usuario diga "corre los tests").
