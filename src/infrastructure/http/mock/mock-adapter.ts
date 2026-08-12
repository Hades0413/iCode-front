import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';
import type {
  MockHttpMethod,
  MockRequest,
  MockResponse,
  MockRoute,
} from './mock-http';

/**
 * Un adapter de axios es el pedacito que hace el viaje a la red. Cambiando
 * SOLO esa pieza (ver ../api-client.ts) el resto del front no se entera de
 * nada: los repositorios siguen llamando apiClient.post(), los
 * interceptores siguen corriendo, y un 4xx sigue llegando como AxiosError
 * con response.status y response.data.message. Por eso el mock vive aquí y
 * no en un repositorio falso: así el código que se ejecuta en dev es el
 * mismo que va a correr contra iCode-back.
 */

/** Latencia artificial: sin esto los estados "Ingresando…" nunca se ven y los loaders quedan sin probar. */
const LATENCY_MS = 350;

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** axios serializa el body ANTES de llegar al adapter, así que aquí vuelve como string. */
function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data ?? null;
  }
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function toMockRequest(
  method: MockHttpMethod,
  rawUrl: string,
  data: unknown,
  authorization: string | null,
): MockRequest {
  // Base descartable: solo sirve para que URL parsee un path relativo y
  // separe el query string.
  const url = new URL(rawUrl, 'http://mock.local');
  const path = url.pathname.replace(/\/+$/, '') || '/';

  return {
    method,
    path,
    body: parseBody(data),
    query: url.searchParams,
    params: {},
    authorization,
  };
}

/**
 * Match de una ruta con params al estilo Nest: el patrón
 * "/patients/:patientId/reminders" contra "/patients/jm/reminders" devuelve
 * { patientId: "jm" }. null = no matchea.
 */
function matchPath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (const [index, part] of patternParts.entries()) {
    const actual = pathParts[index];
    if (part.startsWith(':')) {
      if (!actual) return null;
      params[part.slice(1)] = decodeURIComponent(actual);
    } else if (part !== actual) {
      return null;
    }
  }
  return params;
}

function resolveRoute(
  routes: readonly MockRoute[],
  request: MockRequest,
): { route: MockRoute; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== request.method) continue;
    const params = matchPath(route.path, request.path);
    if (params) {
      return { route, params };
    }
  }
  return null;
}

export function createMockAdapter(routes: readonly MockRoute[]): AxiosAdapter {
  return async function mockAdapter(config) {
    await delay(LATENCY_MS);

    const method = (config.method ?? 'get').toUpperCase() as MockHttpMethod;
    const authorization = config.headers?.get?.('Authorization');
    const request = toMockRequest(
      method,
      config.url ?? '/',
      config.data,
      typeof authorization === 'string' ? authorization : null,
    );

    const matched = resolveRoute(routes, request);

    const result: MockResponse = matched
      ? await matched.route.handler({ ...request, params: matched.params })
      : {
          status: 404,
          data: {
            statusCode: 404,
            message: `Cannot ${request.method} ${request.path}`,
          },
        };

    const response: AxiosResponse = {
      // Los errores del backend real traen timestamp y path; se completan
      // aquí porque el handler no conoce la request completa.
      data: withErrorContext(result, request),
      status: result.status,
      statusText: STATUS_TEXT[result.status] ?? '',
      headers: new AxiosHeaders({ 'content-type': 'application/json' }),
      config,
      request: null,
    };

    const isValid =
      config.validateStatus ??
      ((status: number) => status >= 200 && status < 300);
    if (isValid(response.status)) {
      return response;
    }

    // Mismo error que armaría axios contra un servidor de verdad, para que
    // los interceptores (401 -> icode:session-expired) y
    // getApiErrorMessage() no necesiten un camino especial en dev.
    throw new AxiosError(
      `Request failed with status code ${response.status}`,
      response.status >= 500
        ? AxiosError.ERR_BAD_RESPONSE
        : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    );
  };
}

function withErrorContext(result: MockResponse, request: MockRequest): unknown {
  if (
    result.status < 400 ||
    result.data === null ||
    typeof result.data !== 'object'
  ) {
    return result.data ?? null;
  }
  return {
    ...result.data,
    timestamp: new Date().toISOString(),
    path: request.path,
  };
}
