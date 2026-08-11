/**
 * Espejo de infrastructure/config/app.config.ts en iCode-back: toda
 * variable de entorno se lee en un solo lugar, nunca con
 * import.meta.env.X suelto por el resto del código.
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
};
