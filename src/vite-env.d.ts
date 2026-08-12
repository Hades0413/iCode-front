/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** "1" = backend simulado en el navegador (ver infrastructure/http/api-client.ts). Ausente en producción. */
  readonly VITE_USE_MOCK_DATA?: string;
  /** Usuario con el que la app entra sola (modo prototipo). Ausente en producción. */
  readonly VITE_DEMO_USER?: string;
  /** Contraseña del usuario demo. Ausente en producción. */
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
