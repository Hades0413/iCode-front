/**
 * Espejo de infrastructure/config/app.config.ts en iCode-back: toda
 * variable de entorno se lee en un solo lugar, nunca con
 * import.meta.env.X suelto por el resto del código.
 */
/** Credenciales del usuario con el que la app entra sola. Ver env.demoLogin. */
export interface DemoLogin {
  userName: string;
  password: string;
}

function readDemoLogin(): DemoLogin | null {
  const userName = import.meta.env.VITE_DEMO_USER;
  const password = import.meta.env.VITE_DEMO_PASSWORD;
  return userName && password ? { userName, password } : null;
}

export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',

  /**
   * Modo prototipo: si está configurado, la pantalla de ingreso viene con
   * estos datos puestos y no exige nada — se entra con un click, sin cuenta.
   *
   * No es un bypass de la autenticación: el formulario hace el mismo
   * POST /auth/login que haría cualquiera, con credenciales fijas. Se crea
   * una sesión de verdad, con token opaco, y GET /auth/me trae el perfil. Lo
   * único que no pasa es que alguien las escriba.
   *
   * null = sin configurar = login normal, que es lo que tiene que pasar en
   * producción. Ver la advertencia en .env.example: estas credenciales las
   * hornea Vite en el bundle en build time.
   */
  demoLogin: readDemoLogin(),
};

/**
 * VITE_USE_MOCK_DATA (backend simulado) es la única variable que NO se lee
 * aquí: se lee con import.meta.env directamente en
 * infrastructure/http/api-client.ts. No es un descuido — es la única forma de
 * que Vite la reemplace por un literal y el bundler pueda tirar la carpeta
 * mock/ del build de producción. Detrás de una constante exportada desde este
 * módulo no puede, y los usuarios de prueba terminan dentro del bundle. Está
 * explicado en el comentario de api-client.ts.
 */
