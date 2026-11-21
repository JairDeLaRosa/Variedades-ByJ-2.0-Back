import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

/** Peticiones por minuto y por IP para toda la API. */
export const LIMITE_GENERAL = { ttl: 60_000, limit: 120 };
/** Login y registro: frenan la fuerza bruta de contraseñas y las cuentas basura. */
export const LIMITE_AUTENTICACION = { ttl: 60_000, limit: 5 };

/** Configuración del límite de peticiones, compartida por la app y los tests. */
export const OPCIONES_LIMITE = {
  throttlers: [LIMITE_GENERAL],
  errorMessage: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
};

interface OpcionesSeguridad {
  /** Proxys de confianza delante de la API (Render: 1); 0 si no hay. */
  proxysDeConfianza: number;
  /** Swagger necesita scripts en línea, que la política de `helmet` bloquea. */
  swaggerActivo: boolean;
}

/**
 * Cabeceras de seguridad y lectura de la IP real del visitante. Sin
 * `trust proxy` detrás de Render, el límite de intentos vería a todos los
 * usuarios con la IP del proxy y los contaría juntos.
 */
export function configurarSeguridad(
  app: NestExpressApplication,
  { proxysDeConfianza, swaggerActivo }: OpcionesSeguridad,
) {
  app.set("trust proxy", proxysDeConfianza);
  app.use(helmet({ contentSecurityPolicy: swaggerActivo ? false : undefined }));
}
