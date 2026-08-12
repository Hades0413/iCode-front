import { useCallback } from 'react';
import { useAsyncResource, type AsyncResource } from './use-async-resource';

export interface Queue<T> extends AsyncResource<T[]> {
  /**
   * Reemplaza un elemento sin volver a pedir la bandeja entera. Recargar
   * después de cada acción tiraría el scroll, la página y la fila que el
   * usuario estaba mirando.
   */
  apply: (item: T) => void;
}

/**
 * Una bandeja de trabajo: la lista que trae el servidor, sus tres estados, y
 * la actualización puntual de una fila.
 *
 * Lo usan las dos pantallas del área de Referencias, que hacen exactamente lo
 * mismo con cosas distintas (pacientes por avisar, cartas por enviar); sin
 * esto, cada una repetiría el mismo "cargando / error / reemplaza esa fila"
 * con sus propios bugs.
 */
export function useQueue<T>(
  load: () => Promise<T[]>,
  isSame: (a: T, b: T) => boolean,
  fallbackMessage: string,
): Queue<T> {
  const resource = useAsyncResource<T[]>(load, EMPTY, fallbackMessage);
  const { data, setData } = resource;

  const apply = useCallback(
    (item: T) => {
      setData(data.map((current) => (isSame(current, item) ? item : current)));
    },
    [data, isSame, setData],
  );

  return { ...resource, apply };
}

/** Constante y no un literal: es la dependencia de un efecto. */
const EMPTY: never[] = [];
