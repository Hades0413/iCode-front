import { AxiosError } from 'axios';

/** Forma de error de AllExceptionsFilter en iCode-back. */
interface BackendErrorBody {
  message?: string;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado. Probá de nuevo.',
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
