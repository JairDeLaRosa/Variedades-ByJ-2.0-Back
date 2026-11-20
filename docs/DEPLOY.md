# Despliegue

Cómo se publica Variedades ByJ. Todo en planes gratuitos.

| Pieza              | Servicio                    | Región           | Notas                                             |
| ------------------ | --------------------------- | ---------------- | ------------------------------------------------- |
| Web (React + Vite) | Cloudflare Pages            | global           | Repo `Variedades-ByJ-2.0-web`.                    |
| API (NestJS)       | Render, servicio web gratis | Ohio             | Este repo; se define en `render.yaml`.            |
| Base de datos      | Neon, rama `production`     | us-east-2 (Ohio) | Misma región que la API para tener poca latencia. |
| Fotos y soportes   | Cloudinary                  | global           | Solo la API habla con Cloudinary.                 |

## Qué esperar del plan gratis

- **Render duerme la API tras 15 minutos sin uso.** La primera petición después tarda entre 30 y 60 segundos.
  `GET /api/health` no toca la base de datos a propósito, así el chequeo de Render no despierta a Neon.
- **Neon apaga el cómputo tras 5 minutos sin uso.** Es mucho menos notorio que el sueño de Render.
- Si la espera molesta, el siguiente paso es el plan Starter de Render, que no duerme.

## Variables de entorno de la API

Las define `render.yaml`. Los secretos se escriben **en el panel de Render**, nunca en el repositorio ni en un chat.

| Variable                                                         | Origen                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_VERSION`, `NODE_ENV`, `SWAGGER_ENABLED`                    | Fijas en `render.yaml`.                                                                    |
| `SECRET_JWT_SEED`                                                | La genera Render al crear el Blueprint.                                                    |
| `DATABASE_URL`                                                   | Neon, rama `production`, **conexión con pooler**.                                          |
| `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Panel de Cloudinary.                                                                       |
| `CORS_ORIGINS`                                                   | URL de la web, por ejemplo `https://variedades-byj.pages.dev`. Varias se separan con coma. |

## Primer despliegue

1. **Neon:** cambia la contraseña del rol y copia la cadena de conexión con pooler de la rama `production`.
2. **Render:** crea un Blueprint desde este repositorio. Pedirá los valores marcados con `sync: false`.
   Para `CORS_ORIGINS` pon un valor provisional; se corrige cuando exista la web.
3. Espera el primer despliegue y comprueba `https://<servicio>.onrender.com/api/health`: debe responder `{"status":"ok"}`.
4. **Cloudflare Pages:** conecta el repositorio de la web con estos ajustes.
   - Comando de build: `npm run build`. Carpeta de salida: `dist`.
   - Variable `VITE_API_URL` = `https://<servicio>.onrender.com/api`. Vite la fija al compilar, así que si cambia hay que volver a desplegar la web.
   - `NODE_VERSION` = `20`.
5. Vuelve a Render y pon la URL real de la web en `CORS_ORIGINS`.
6. Crea el primer administrador (ver abajo).

## Migraciones de la base de datos

El plan gratis de Render no permite comandos previos al despliegue, así que las migraciones se aplican a mano **antes** de
desplegar una versión que las necesite:

```bash
# Con DATABASE_URL_UNPOOLED apuntando a la rama production de Neon
npm run migration:run
```

Las migraciones existentes (usuarios, ventas, salidas y productos) ya están aplicadas en `production`.

## Primer administrador

El registro siempre crea usuarios sin permisos. Para tener el primer administrador:

1. Regístrate desde la web con tu correo.
2. En Neon, ejecuta sobre la rama `production`:

   ```sql
   UPDATE usuarios SET admin = true WHERE email = 'tu@correo.com';
   ```

3. Cierra sesión y vuelve a entrar para que el token incluya el permiso.

## Despliegues posteriores

Render despliega solo cuando el CI de GitHub pasa (`autoDeployTrigger: checksPass`), y Cloudflare Pages despliega cada
vez que se mergea a `main`. Para volver a una versión anterior, usa **Rollback** en el panel de Render.

## Problemas frecuentes

- **La web carga pero no hay datos o el login falla:** casi siempre es `CORS_ORIGINS` sin la URL exacta de la web
  (con `https://` y sin barra al final), o `VITE_API_URL` apuntando mal.
- **El despliegue falla al arrancar:** revisa los registros; la validación de entorno (`env.validation.ts`) dice qué
  variable falta.
- **La primera petición tarda casi un minuto:** es el sueño del plan gratis, no un fallo.
