import axios from 'axios';
import { env } from '../config/env';

/** Evento propio para "la sesión ya no sirve" — AuthProvider lo escucha para limpiar el estado de React sin acoplar este archivo a React. */
export const SESSION_EXPIRED_EVENT = 'icode:session-expired';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  // El token viaja en una cookie httpOnly que pone iCode-back (ver
  // SESSION_COOKIE_NAME) — sin esto, el navegador no la manda en un
  // request cross-origin (el front corre en otro puerto que la API) ni
  // guarda la que llega en la respuesta de /auth/login.
  withCredentials: true,
});

/**
 * Único punto que cambia entre "con backend real" y "con datos estáticos": el
 * adapter es la pieza de axios que hace el viaje a la red, así que
 * reemplazarla deja todo lo de arriba intacto (repositorios, los
 * interceptores de aquí abajo, AxiosError, getApiErrorMessage).
 *
 * Dos detalles que parecen manías y no lo son:
 *
 * 1. La flag se lee aquí con import.meta.env y no desde config/env.ts, que es
 *    donde va todo el resto. Es la ÚNICA excepción, y es para que Vite la
 *    reemplace por un literal y el bundler pueda dar la rama por muerta.
 *    Detrás de una constante importada de otro módulo no lo logra, y la
 *    carpeta mock/ termina en el build de producción.
 * 2. El import es DINÁMICO. Con un import estático, rolldown deja el mock
 *    dentro del bundle aunque la rama esté muerta — comprobado: 4
 *    apariciones de la password del seed en dist/.
 *
 * Con la flag desactivada, entonces, no queda ni una referencia ni un chunk. Con
 * la flag activada el mock sale aparte y se carga al arrancar.
 *
 * El adapter espera a que el módulo cargue, así que un request disparado en
 * el arranque (el getCurrentUser de AuthProvider) no se pierde ni sale a la
 * red por error.
 */
if (import.meta.env.VITE_USE_MOCK_DATA === '1') {
  console.warn(
    '[icode] VITE_USE_MOCK_DATA=1 — la API está simulada en el navegador, ningún request sale a la red. No usar en producción.',
  );

  const pendingMockAdapter = Promise.all([
    import('./mock/mock-adapter'),
    import('./mock/mock-routes'),
  ]).then(([{ createMockAdapter }, { mockRoutes }]) =>
    createMockAdapter(mockRoutes),
  );

  apiClient.defaults.adapter = async (config) =>
    (await pendingMockAdapter)(config);
}

// Un 401 aquí significa lo mismo que en el backend: sesión revocada,
// expirada, o el usuario fue desactivado (ver SessionAuthGuard). No hay
// nada que "limpiar" del lado del cliente (el token vive en una cookie
// httpOnly que el propio backend vence/borra) — solo avisarle a la UI.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);
