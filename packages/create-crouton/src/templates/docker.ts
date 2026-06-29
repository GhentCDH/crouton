/**
 * Docker templates: Dockerfile.dev, Dockerfile.prod, compose.yml, .dockerignore
 */

import type { ScaffoldFile } from '../lib/files.js';
import type { Tokens } from '../lib/render.js';

// ── Dockerfile.dev ────────────────────────────────────────────────────────────
const dockerfileDev = (t: Tokens, isNx: boolean, includeFrontend: boolean): string => `
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

COPY package.json ${isNx ? 'pnpm-workspace.yaml ' : ''}pnpm-lock.yaml* ./
${isNx ? 'COPY apps ./apps\nCOPY generated ./generated\nCOPY libs ./libs\n' : ''}RUN pnpm install --frozen-lockfile

COPY . .
RUN ${isNx ? 'pnpm nx run backend:prisma-generate 2>/dev/null || pnpm prisma generate' : 'pnpm prisma generate'}

EXPOSE ${t.backendPort}${includeFrontend ? `\nEXPOSE ${t.frontendPort}` : ''}

# Runs backend (and optionally frontend dev server) with live file-watching.
# Source is bind-mounted from the host via compose.yml — edits trigger HMR.
CMD ["pnpm", "${isNx ? 'nx run-many --target=serve --parallel' : 'dev'}"]
`.trimStart();

// ── Dockerfile.prod ───────────────────────────────────────────────────────────
const dockerfileProd = (t: Tokens, isNx: boolean, includeFrontend: boolean): string => {
  const backendDist = isNx ? `apps/${t.backendAppName}/dist` : 'dist';
  const frontendDist = isNx ? `apps/${t.frontendAppName}/dist` : 'frontend/dist';
  const resDirSrc = isNx ? `apps/${t.backendAppName}/src/app/resources` : 'resources';
  const mainJs = isNx ? `${backendDist}/main.js` : `${backendDist}/main.js`;

  return `
# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY package.json ${isNx ? 'pnpm-workspace.yaml ' : ''}pnpm-lock.yaml* ./
${isNx ? 'COPY apps ./apps\nCOPY generated ./generated\nCOPY libs ./libs\n' : ''}RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm build${isNx ? ' || pnpm nx run-many --target=build --all' : ''}

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /app

COPY package.json ${isNx ? 'pnpm-workspace.yaml ' : ''}pnpm-lock.yaml* ./
${isNx ? 'COPY apps ./apps\nCOPY generated ./generated\n' : ''}RUN pnpm install --frozen-lockfile --prod

# Compiled backend
COPY --from=builder /app/${backendDist} ./${backendDist}
${includeFrontend ? `
# Frontend static assets — served by NestJS ServeStaticModule on port ${t.backendPort}
COPY --from=builder /app/${frontendDist} ./public
` : ''}
# Runtime JSON assets: crouton-api reads these at startup
COPY --from=builder /app/crouton.enums.json ./crouton.enums.json
COPY --from=builder /app/data-sources ./data-sources
COPY --from=builder /app/${resDirSrc} ./resources

# Prisma engine + schema
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE ${t.backendPort}
USER node

CMD ["node", "${mainJs}"]
`.trimStart();
};

// ── compose.yml (dev) ─────────────────────────────────────────────────────────
const composeYml = (t: Tokens, includeFrontend: boolean): string => `
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: crouton
      POSTGRES_PASSWORD: crouton
      POSTGRES_DB: ${t.dbName}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crouton"]
      interval: 5s
      retries: 5

  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile.dev
    env_file: ../.env
    environment:
      DATABASE_URL: postgresql://crouton:crouton@db:5432/${t.dbName}?schema=public
    ports:
      - "${t.backendPort}:${t.backendPort}"${includeFrontend ? `\n      - "${t.frontendPort}:${t.frontendPort}"` : ''}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ..:/app
      - /app/node_modules   # keep container node_modules isolated from host

volumes:
  postgres_data:
`.trimStart();

// ── .dockerignore ─────────────────────────────────────────────────────────────
const dockerignore = (): string => `
node_modules
dist
.git
.env
*.log
`.trim() + '\n';

export const buildDockerFiles = (
  t: Tokens,
  opts: { isNx: boolean; includeFrontend: boolean },
): ScaffoldFile[] => [
  { path: 'docker/Dockerfile.dev', contents: dockerfileDev(t, opts.isNx, opts.includeFrontend) },
  { path: 'docker/Dockerfile.prod', contents: dockerfileProd(t, opts.isNx, opts.includeFrontend) },
  { path: 'docker/compose.yml', contents: composeYml(t, opts.includeFrontend) },
  { path: 'docker/.dockerignore', contents: dockerignore() },
];
