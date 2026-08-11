.DEFAULT_GOAL := help
.PHONY: help install env-setup dev build preview lint format clean \
        docker-up docker-restart docker-down docker-build docker-logs docker-ps docker-reset \
        docker-up-prod docker-down-prod docker-build-prod docker-logs-prod docker-ps-prod \
        ssl-generate docker-nuke

## help: lista todos los comandos disponibles
help:
	@echo "Uso: make <comando>"
	@echo ""
	@grep -E '^## [a-zA-Z0-9_-]+:' Makefile | sed 's/## /  /'

## install: instala las dependencias del proyecto
install:
	pnpm install

## env-setup: crea .env.dev y .env.prod (para Docker) a partir de .env.example si no existen
env-setup:
	@test -f .env.dev || (cp .env.example .env.dev && echo "Creado .env.dev — revisá sus valores")
	@test -f .env.prod || (cp .env.example .env.prod && echo "Creado .env.prod — completá VITE_API_URL con la URL real de la API antes de compilar")

## dev: levanta el servidor de desarrollo de Vite sin Docker (hot-reload, lee .env.local)
dev:
	pnpm run dev

## build: typecheck + build de producción a dist/ (lee .env.local/.env.production si existen)
build:
	pnpm run build

## preview: sirve el build de producción localmente, sin Docker
preview:
	pnpm run preview

## lint: corre ESLint y corrige lo que pueda
lint:
	pnpm run lint

## format: formatea src/ con Prettier
format:
	pnpm run format

## clean: borra dist/ y la cache de Vite
clean:
	rm -rf dist .vite

# docker-compose.yml es la plantilla base. docker-compose.override.yml
# (dev) se suma solo sin -f — es el comportamiento estándar de Compose
# para ese nombre de archivo. Producción encadena el prod.yml a mano. Cada
# stack usa su propio nombre de proyecto (-p) para no compartir por
# accidente contenedores entre dev y prod en la misma máquina.
DEV_COMPOSE := docker compose -p icode-front-dev --env-file .env.dev
PROD_COMPOSE := docker compose -p icode-front-prod --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml

## docker-up: DEV — levanta Vite con hot-reload dentro de un contenedor (NO reconstruye la imagen si ya existe)
docker-up:
	$(DEV_COMPOSE) up -d

## docker-restart: DEV — recrea el contenedor para que relea .env.dev (sin rebuild de imagen). Los cambios de código NO necesitan esto: ya recargan solos.
docker-restart:
	$(DEV_COMPOSE) up -d --force-recreate --no-build web

## docker-down: DEV — baja el contenedor
docker-down:
	$(DEV_COMPOSE) down

## docker-reset: DEV — baja el contenedor y borra volúmenes anónimos (node_modules del contenedor)
docker-reset:
	$(DEV_COMPOSE) down -v

## docker-build: DEV — reconstruye la imagen a mano (solo hace falta si cambiaste package.json/pnpm-lock.yaml o el Dockerfile)
docker-build:
	$(DEV_COMPOSE) build

## docker-logs: DEV — sigue los logs del contenedor
docker-logs:
	$(DEV_COMPOSE) logs -f

## docker-ps: DEV — estado del contenedor
docker-ps:
	$(DEV_COMPOSE) ps

## ssl-generate: crea un certificado self-signed en docker/ssl/ si no existe (ver docker/ssl/README.md)
ssl-generate:
	@test -f docker/ssl/fullchain.pem || openssl req -x509 -nodes -newkey rsa:2048 \
		-keyout docker/ssl/privkey.pem -out docker/ssl/fullchain.pem \
		-days 365 -subj "/C=PE/ST=Lima/L=Lima/O=iCode/OU=Frontend/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

## docker-up-prod: PROD — compila el bundle con VITE_API_URL de .env.prod y levanta nginx (TLS + estáticos)
docker-up-prod: ssl-generate
	$(PROD_COMPOSE) up --build -d

## docker-down-prod: PROD — baja el contenedor
docker-down-prod:
	$(PROD_COMPOSE) down

## docker-build-prod: PROD — reconstruye la imagen sin levantar nada
docker-build-prod:
	$(PROD_COMPOSE) build

## docker-logs-prod: PROD — sigue los logs de nginx
docker-logs-prod:
	$(PROD_COMPOSE) logs -f

## docker-ps-prod: PROD — estado del contenedor
docker-ps-prod:
	$(PROD_COMPOSE) ps

## docker-nuke: borra contenedores e imágenes de icode-front-dev e icode-front-prod. No toca nada de otros proyectos.
docker-nuke:
	@echo "Esto borra TODO lo de icode-front-dev e icode-front-prod: contenedores e imágenes. No afecta a otros proyectos Docker de esta máquina."
	@echo "Ctrl+C en los próximos 5s para cancelar."
	@sleep 5
	$(DEV_COMPOSE) down -v --rmi all --remove-orphans
	$(PROD_COMPOSE) down -v --rmi all --remove-orphans
