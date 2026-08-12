import { useCallback, useRef, useState } from 'react';

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: 'ok' | 'err';
}

const VISIBLE_MS = 4200;

/**
 * Avisos efímeros para confirmar acciones. Sin esto, notificar a la posta no
 * tiene ninguna respuesta visible más que un cambio chico en la fila, y
 * queda la duda de si el click hizo algo.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { ...toast, id }]);
      setTimeout(() => dismiss(id), VISIBLE_MS);
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}
