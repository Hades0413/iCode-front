/**
 * Espejo de UserProfile en iCode-back (src/application/services/auth.service.ts).
 * Sin dependencias de React/axios a propósito: esta capa es pura, no sabe
 * cómo se obtiene el dato ni cómo se renderiza.
 */
export interface AuthenticatedUser {
  id: number;
  userName: string;
  email: string | null;
  firstName: string;
  lastName: string;
  permissions: string[];
}
