# syntax=docker/dockerfile:1
#
# Un solo Dockerfile para dev y prod — lo que cambia es el "target":
# docker-compose.override.yml (dev, automático) usa "dev",
# docker-compose.prod.yml usa "runtime". Ningún archivo duplicado que
# pueda quedar desincronizado (mismo criterio que iCode-back).

# ---- deps: instala TODAS las dependencias (dev incluidas, hacen falta para build) ----
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- dev: código fuente montado como bind mount (ver override), hot-reload real ----
FROM deps AS dev
COPY . .
EXPOSE 5173
# "pnpm run dev -- --host 0.0.0.0" NO funciona acá: pnpm reenvía el "--"
# tal cual a Vite, que lo interpreta como fin-de-flags y termina
# ignorando "--host" (comprobado: el server queda escuchando solo en el
# loopback del contenedor, "Network: use --host to expose" en el log
# pese al flag). Por eso "--host" vive en el script "dev" del
# package.json, no acá.
CMD ["pnpm", "run", "dev"]

# ---- build: compila con Vite -> dist/ (assets estáticos) ----
FROM deps AS build
# Vite "hornea" las VITE_* en el bundle en BUILD TIME, no en runtime como
# las env vars del backend — por eso entra como build arg, no como
# env_file del contenedor final (ver docker-compose.prod.yml y .env.example).
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN pnpm run build

# ---- runtime: nginx sirviendo el build estático + TLS, sin Node ni toolchain ----
FROM nginx:1.27-alpine AS runtime
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-check-certificate -q -O /dev/null https://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
