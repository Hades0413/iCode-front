/**
 * Contrato del "backend simulado" que vive detrás de axios (ver
 * ./mock-adapter.ts). La idea es que escribir un endpoint falso se parezca
 * a escribir un controller de iCode-back: recibes un request ya parseado y
 * devuelves status + body, nada de tocar axios a mano.
 */

export type MockHttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Equivalente al Request que recibe un controller de Nest, ya parseado. */
export interface MockRequest {
  method: MockHttpMethod;
  /** Path sin baseURL ni query string — ej. "/auth/login". */
  path: string;
  /** Body ya deserializado (axios se lo pasa al adapter como string). */
  body: unknown;
  query: URLSearchParams;
  /** Params de la ruta: el patrón "/patients/:patientId/reminders" contra
   *  "/patients/jm/reminders" deja { patientId: "jm" }. */
  params: Record<string, string>;
  /** Header Authorization tal cual lo dejó el interceptor de api-client. */
  authorization: string | null;
}

export interface MockResponse {
  status: number;
  data?: unknown;
}

export type MockHandler = (
  request: MockRequest,
) => MockResponse | Promise<MockResponse>;

export interface MockRoute {
  method: MockHttpMethod;
  /** Path exacto, o con params al estilo Nest: "/patients/:patientId/reminders". */
  path: string;
  handler: MockHandler;
}

/**
 * Espejo del body de error de AllExceptionsFilter en iCode-back — es la
 * forma que common/utils/get-api-error-message.ts espera encontrar. Los
 * campos "timestamp" y "path" los completa el adapter, que es el único que
 * conoce la request.
 */
export function mockError(status: number, message: string): MockResponse {
  return { status, data: { statusCode: status, message } };
}
