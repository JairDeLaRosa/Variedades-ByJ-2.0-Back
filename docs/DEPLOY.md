# Despliegue

Cómo se publica Variedades ByJ. Todo en planes gratuitos.

| Pieza              | Servicio                       | Región           | Notas                                                                         |
| ------------------ | ------------------------------ | ---------------- | ----------------------------------------------------------------------------- |
| Web (React + Vite) | Cloudflare Workers (estáticos) | global           | Repo `Variedades-ByJ-2.0-web`; se define en su `wrangler.jsonc`.              |
| API (NestJS)       | Render, servicio web gratis    | Ohio             | Este repo; se define en `render.yaml`.                                        |
| Base de datos      | Neon, rama `production`        | us-east-2 (Ohio) | Misma región que la API para tener poca latencia.                             |
| Fotos y soportes   | Cloudinary                     | global           | Solo la API habla con Cloudinary; el navegador solo muestra las URL públicas. |

## Qué esperar del plan gratis

- **Render duerme la API tras 15 minutos sin uso.** La primera petición después tarda entre 30 y 60 segundos.
  `GET /api/health` no toca la base de datos a propósito, así el chequeo de Render no despierta a Neon.
- **Neon apaga el cómputo tras 5 minutos sin uso.** Es mucho menos notorio que el sueño de Render.
- Si la espera molesta, el siguiente paso es el plan Starter de Render, que no duerme.

## Variables de entorno de la API

Las define `render.yaml`. Los secretos se escriben **en el panel de Render**, nunca en el repositorio ni en un chat.

| Variable                                                         | Origen                                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `NODE_VERSION`, `NODE_ENV`, `SWAGGER_ENABLED`                    | Fijas en `render.yaml`.                                                                                                  |
| `SECRET_JWT_SEED`                                                | La genera Render al crear el Blueprint.                                                                                  |
| `DATABASE_URL`                                                   | Neon, rama `production`, **conexión con pooler**.                                                                        |
| `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Panel de Cloudinary.                                                                                                     |
| `TRUST_PROXY`                                                    | Fija en `render.yaml` (`3`): saltos de proxy delante de la API, para leer la IP real y limitar intentos de login.        |
| `CORS_ORIGINS`                                                   | URL exacta de la web, por ejemplo `https://variedades-byj-2-0-web.<subdominio>.workers.dev`. Varias, separadas por coma. |

## Primer despliegue

1. **Neon:** cambia la contraseña del rol y copia la cadena de conexión con pooler de la rama `production`.
2. **Render:** crea un Blueprint desde este repositorio. Pedirá los valores marcados con `sync: false`.
   Para `CORS_ORIGINS` pon un valor provisional; se corrige cuando exista la web.
3. Espera el primer despliegue y comprueba `https://<servicio>.onrender.com/api/health`: debe responder `{"status":"ok"}`.
4. **Cloudflare Workers:** en el panel, crea un Worker desde el repositorio de la web (**Workers & Pages, Create,
   Import a repository**). El nombre del Worker debe coincidir con `name` en `wrangler.jsonc`
   (`variedades-byj-2-0-web`). Ajustes:
   - Comando de build: `npm run build`. La carpeta `dist` y el comportamiento de aplicación de una sola página
     (cualquier ruta sirve `index.html`) ya están en `wrangler.jsonc`.
   - En **Settings, Build, Variables and secrets** (variables **de build**, no de ejecución) agrega:
     - `VITE_API_URL` = `https://<servicio>.onrender.com/api`. Vite la fija al compilar, así que si cambia hay que
       volver a desplegar la web. Si falta, la web apunta a `http://localhost:3001/api`.
     - `NODE_VERSION` = `20`.
   - La URL pública queda en **Settings, Domains & Routes**: `https://variedades-byj-2-0-web.<subdominio>.workers.dev`.
5. Vuelve a Render y pon esa URL, sin barra final, en `CORS_ORIGINS`. Cambiarla redespliega la API.
6. Crea el primer administrador (ver abajo).

> Cloudflare no entiende Vite 5 por sí solo; por eso el repositorio de la web trae `wrangler.jsonc` con la carpeta de
> salida explícita. Sin ese archivo el build falla con «Vite cannot be automatically configured».

## Cloudinary

- **PDF:** las cuentas nuevas bloquean la entrega de PDF y ZIP (responde 401 con `deny or ACL failure`). Activa
  **Settings, Security, PDF and ZIP files delivery, Allow delivery of PDF and ZIP files** y guarda. Las URL de
  Cloudinary son largas pero **no son privadas**: si algún día se suben documentos sensibles, hay que pasar a URL firmadas.
- **Límites de subida:** productos y salidas reciben las fotos en el mismo `multipart/form-data` que los datos.
  Máximo 5 archivos por registro y 3 MB en total por envío; tipos jpg, png, webp, gif y PDF (este solo en salidas).
  La web comprime las imágenes antes de enviarlas. El backend sube a Cloudinary, guarda en una transacción y, si la base
  falla, borra lo que acababa de subir.
- Un archivo puede quedar huérfano en Cloudinary solo si el proceso se reinicia entre la subida y el guardado, o si
  Cloudinary falla al borrar (queda un aviso en el registro).

## Migraciones de la base de datos

El plan gratis de Render no permite comandos previos al despliegue, así que las migraciones se aplican a mano **antes** de
desplegar una versión que las necesite:

```bash
# Con DATABASE_URL_UNPOOLED apuntando a la rama production de Neon
npm run migration:run
```

Las migraciones existentes (usuarios, ventas, salidas y productos) ya están aplicadas en `production`.

## Primer administrador

El registro siempre crea clientes (el rol más bajo). Para tener el primer administrador:

1. Regístrate desde la web con tu correo (la contraseña necesita al menos 6 caracteres).
2. En Neon, ejecuta sobre la rama `production`:

   ```sql
   UPDATE usuarios
   SET rol_id = (SELECT id FROM roles WHERE clave = 'admin')
   WHERE email = 'tu@correo.com';
   ```

3. Cierra sesión y vuelve a entrar para que el token incluya el permiso.

## Roles y permisos

Los permisos (las acciones del sistema, como `productos.crear` o `salidas.eliminar`) viven en el código, en
`src/auth/permisos.ts`. Los **roles** viven en la base de datos y eligen cuáles tienen; se crean y configuran desde
**Roles** en el panel. Cada usuario tiene un rol.

- **Administrador** (rol del sistema): siempre tiene todos los permisos, también los que se agreguen después. No se edita
  ni se borra.
- **Cliente** (rol del sistema): es el que recibe quien se registra y no entra al panel.
- **Vendedor**: viene precargado como punto de partida y se puede editar o borrar.

El backend lee el rol y los permisos de la base de datos en cada petición protegida, así que un cambio vale al instante
aunque la persona conserve su token. Nadie puede dar permisos que no tiene, y siempre queda al menos un administrador.

La migración `RolesYPermisos` reemplaza la columna `usuarios.admin` por `usuarios.rol_id`: los administradores actuales
siguen siéndolo y los demás quedan como clientes. Como el plan gratis no corre migraciones al desplegar, el orden es:
**1)** aplicar la migración en la rama `production`, **2)** mergear. Entre los dos pasos la versión anterior de la API
falla al iniciar sesión, por eso conviene hacerlos seguidos. Para volver atrás: `npm run migration:revert`.

## Facturas y salidas como pagos

La migración `CreateFacturas` crea `facturas` (con sus soportes y cuotas), convierte cada salida existente en una factura
libre ya pagada y reemplaza `salidas.factura` y `salidas.tienda` por `salidas.factura_id` (opcional) y `salidas.nota`.
Si dos salidas repiten número de factura, el índice único falla y la migración no cambia nada: corrige los números y
vuelve a correrla. El contrato de `api/salidas` cambia y las versiones anteriores de la web dejan de poder registrar
salidas, así que el orden es: **1)** aplicar la migración en `production`, **2)** mergear el back, **3)** mergear la web,
los tres seguidos. Después hay que dar los permisos `facturas.*` a los roles que no sean Administrador. Para volver atrás:
`npm run migration:revert` (los pagos libres quedan con factura `S/N` y proveedor `Sin proveedor`, y se pierde el detalle
de abonos, cuotas y soportes de factura).

## Despliegues posteriores

Render despliega solo cuando el CI de GitHub pasa (`autoDeployTrigger: checksPass`), y Cloudflare despliega cada vez que
se mergea a `main`. Para volver a una versión anterior, usa **Rollback** en el panel de Render y **Deployments** en el
del Worker.

Si cambian a la vez el contrato de la API y el de la web (por ejemplo, el paso a `multipart/form-data`), mergea primero
el lado que sigue siendo compatible o los dos seguidos: durante unos minutos los dos servicios van en versiones distintas.

## Registros

- **API:** pestaña **Logs** del servicio en Render.
- **Web:** `wrangler.jsonc` activa `observability` con registros de invocación persistentes; se ven en el Worker, en
  **Observability**. Solo registran las visitas al Worker, no las llamadas de la web a la API.

## Límite de intentos y `TRUST_PROXY`

Login y registro admiten 5 peticiones por minuto y por IP (responden 429). La IP se lee de `X-Forwarded-For`, y
`TRUST_PROXY` dice cuántos saltos de proxy hay delante de la API. En Render son **3**: con 1 o 2 el límite no bloqueaba,
porque la API veía la IP de un servidor de la infraestructura distinta en cada petición. Para comprobarlo tras un cambio:
6 logins fallidos seguidos deben dar 401 cinco veces y 429 la sexta, también si cada petición manda una
`X-Forwarded-For` inventada distinta.

## Problemas frecuentes

- **La web carga pero no hay datos o el login falla:** casi siempre es `CORS_ORIGINS` sin la URL exacta de la web
  (con `https://` y sin barra al final), o `VITE_API_URL` apuntando mal. Recuerda que `VITE_API_URL` es una variable de
  **build**: tras cambiarla hay que volver a desplegar la web.
- **El despliegue de la API falla al arrancar:** revisa los registros; la validación de entorno (`env.validation.ts`)
  dice qué variable falta.
- **La primera petición tarda casi un minuto:** es el sueño del plan gratis, no un fallo.
- **El check de Cloudflare sale en rojo en un PR pero el de `main` pasa:** ha ocurrido en varios PRs de la web; el
  detalle del build de la rama solo está en el panel de Cloudflare. Revisa que el de `main` termine en éxito tras mergear.
- **Los PDF subidos dan 401 al abrirlos:** falta activar la entrega de PDF en Cloudinary (ver arriba).
