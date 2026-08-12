import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from '../../common/utils/get-api-error-message';

export interface LoadError {
  /** null si el request nunca llegó al servidor (se cayó la red). */
  status: number | null;
  message: string;
}

export interface AsyncResource<T> {
  data: T;
  isLoading: boolean;
  error: LoadError | null;
  reload: () => void;
  /** Reemplaza el dato sin volver a pedirlo (ej. tras una acción puntual). */
  setData: (next: T) => void;
}

/**
 * Traer algo del servidor con sus tres estados. Lo usan el contexto de la
 * cohorte y el panel de seguimiento: sin esto, cada uno repetiría el mismo
 * "cargando / error / reintentar" con sus propios bugs.
 *
 * `load` tiene que ser estable (useCallback en el llamador), porque es lo que
 * dispara la recarga.
 */
export function useAsyncResource<T>(
  load: () => Promise<T>,
  initial: T,
  fallbackMessage = 'No se pudo cargar la información.',
): AsyncResource<T> {
  const [data, setData] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // El valor inicial se congela: si el llamador pasa un literal ([] o {}),
  // usarlo como dependencia dispararía un pedido en cada render.
  const emptyRef = useRef(initial);

  /**
   * El "cargando" se activa aquí y no dentro del efecto: llamar a setState
   * sincrónicamente en el cuerpo de un efecto encadena renders (y la regla
   * react-hooks/set-state-in-effect lo marca). En un handler es correcto.
   */
  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    load()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Un 401 no se muestra como error de pantalla: el interceptor de
        // api-client ya disparó icode:session-expired y AuthProvider va a
        // sacar al usuario al login.
        setData(emptyRef.current);
        setError({
          status: getApiErrorStatus(err),
          message: getApiErrorMessage(err, fallbackMessage),
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [load, reloadKey, fallbackMessage]);

  return { data, isLoading, error, reload, setData };
}
