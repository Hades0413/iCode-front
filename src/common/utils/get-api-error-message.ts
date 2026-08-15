import { AxiosError } from 'axios';

/** Forma de error de AllExceptionsFilter en iCode-back. */
interface BackendErrorBody {
  message?: string;
}

/**
 * El status HTTP, cuando lo hay. Sirve para distinguir "no tienes permiso"
 * (403) de "se cayó algo" (5xx) sin que presentation tenga que importar
 * axios y enterarse del transporte.
 */
export function getApiErrorStatus(error: unknown): number | null {
  return error instanceof AxiosError ? (error.response?.status ?? null) : null;
}

/**
 * El 404 de "esta ruta no existe" que arma Nest (y el mock, para calzar con
 * eso) cuando ningún endpoint matchea — no un negocio que decidió avisar
 * algo, sino la ruta mal escrita o todavía no implementada. Nunca es un
 * mensaje pensado para que lo lea el médico, así que no se muestra tal cual:
 * "Cannot GET /patients/jm/attachments" no le dice nada a nadie salvo a
 * quien escribió el código.
 */
const UNMATCHED_ROUTE_MESSAGE = /^Cannot (GET|POST|PUT|PATCH|DELETE) /;

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado. Prueba de nuevo.',
): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as BackendErrorBody | undefined;
    if (body?.message && !UNMATCHED_ROUTE_MESSAGE.test(body.message)) {
      return body.message;
    }
    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor.';
    }
  }
  return fallback;
}
