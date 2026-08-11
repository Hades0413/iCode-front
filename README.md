# iCode-front

Frontend web de **Puente 18+** (Hackatón Niño San Borja 2026) — consume la
API de [iCode-back](../iCode-back). React + Vite + SWC + TypeScript.

## Arquitectura

Mismas capas que iCode-back, adaptadas a un SPA — cada una depende solo de
la de abajo, nunca al revés:

```
src/
  domain/          # Tipos puros de negocio, sin React ni axios
  application/      # Casos de uso (AuthService) + "puertos" (interfaces)
                     # que infrastructure implementa — inversión de
                     # dependencias, igual que un service de Nest
                     # recibiendo sus repositorios inyectados
  infrastructure/    # Implementaciones concretas: axios (http/), 
                     # localStorage (storage/), variables de entorno
                     # (config/)
  presentation/      # React: contexto de auth, rutas, páginas
  common/            # Utilidades transversales (parseo de errores de API)
```

`application/ports/*.port.ts` son las interfaces (`AuthRepositoryPort`,
`TokenStoragePort`); `infrastructure/repositories` e
`infrastructure/storage` las implementan. `AuthService` (application)
nunca importa axios ni localStorage directamente — así se puede testear
con fakes. El "cableado" (qué implementación concreta usa cada puerto)
pasa en un solo lugar: `presentation/context/auth.context.tsx`.

## Setup

```bash
pnpm install
cp .env.example .env.local   # y ajustá VITE_API_URL si iCode-back no corre en :3000
pnpm dev
```

```bash
pnpm build      # typecheck + build de producción
pnpm lint
pnpm preview    # sirve el build de producción localmente
```

## Autenticación

Igual que documenta iCode-back: el login devuelve un **token opaco** (no
JWT) que se manda como `Authorization: Bearer <token>` en cada request
(ver `infrastructure/http/api-client.ts`). Se guarda en `localStorage` —
tradeoff consciente para un prototipo de hackatón (un despliegue real
debería usar una cookie `httpOnly` del lado del backend para no
exponerlo a un XSS).

Un `401` de cualquier endpoint (sesión revocada, expirada, o usuario
desactivado — ver `SessionAuthGuard` en iCode-back) dispara el evento
`icode:session-expired`, que `AuthProvider` escucha para cerrar la
sesión del lado del cliente sin esperar a la próxima navegación.

`ProtectedRoute` (`presentation/routes/`) es solo UX: redirige a
`/login` si no hay sesión, pero la autorización real siempre la decide
el servidor — la misma filosofía que el README de iCode-back sobre
`RoleMenu` (OWASP A01: Broken Access Control nunca se resuelve
ocultando algo en el cliente).

Usuarios de prueba: los mismos del seed de iCode-back (`admin` /
`Passw0rd1!`, entre otros — ver
[el README de iCode-back](../iCode-back/README.md#autenticación)).
