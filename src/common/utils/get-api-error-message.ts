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

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado. Prueba de nuevo.',
): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as BackendErrorBody | undefined;
    if (body?.message) {
      return body.message;
    }
    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor.';
    }
  }
  return fallback;
}
