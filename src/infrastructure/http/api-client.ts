import axios from 'axios';
import { env } from '../config/env';
import { tokenStorage } from '../storage/token-storage';

/** Evento propio para "la sesión ya no sirve" — AuthProvider lo escucha para limpiar el estado de React sin acoplar este archivo a React. */
export const SESSION_EXPIRED_EVENT = 'icode:session-expired';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
});

// Igual que SessionAuthGuard del lado del servidor: acá solo AGREGAMOS el
// header, la validación real siempre pasa en iCode-back.
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un 401 acá significa lo mismo que en el backend: sesión revocada,
// expirada, o el usuario fue desactivado (ver SessionAuthGuard) — no hay
// forma de "refrescar" un token opaco, así que la única salida es
// limpiarlo y avisar a la UI.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      tokenStorage.clearToken();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);
