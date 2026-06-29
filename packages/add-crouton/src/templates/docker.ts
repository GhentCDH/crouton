/**
 * Docker templates for add-crouton.
 * (Re-implements the same logic as create-crouton/templates/docker.ts —
 *  both CLIs are standalone binaries with no shared library dep.)
 */

import type { AddFile } from '../lib/files.js';

export interface DockerTokens {
  name: string;
  pm: string;
  pmRun: string;
  backendPort: string;
  frontendPort: string;
  dbName: string;
  urlEnv: string;
  backendAppName: string;
  frontendAppName: string;
}

const dockerfileDev = (t: DockerTokens, isNx: boolean, includeFrontend: boolean): string => `
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

COPY package.json ${isNx ? 'pnpm-workspace.yaml ' : ''}pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate

EXPOSE ${t.backendPort}${includeFrontend ? `\nEXPOSE ${t.frontendPort}` : ''}

CMD ["pnpm", "${isNx ? 'nx run-many --target=serve --parallel' : 'dev'}"]
`.trimStart();

const dockerfileProd = (t: DockerTokens, isNx: boolean, includeFrontend: boolean): string => {
  const backendDist = isNx ? `apps/${t.backendAppName}/dist` : 'dist';
  const frontendDist = isNx ? `apps/${t.frontendAppName}/dist` : 'frontend/dist';
  const resDirSrc = isNx ? `apps/${t.backendAppName}/src/app/resources` : 'resources';

  return `
# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY package.json ${isNx ? 'pnpm-workspace.yaml ' : ''}pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate && pnpm build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/${backendDist} ./${backendDist}
${includeFrontend ? `COPY --from=builder /app/${frontendDist} ./public\n` : ''}
COPY --from=builder /app/crouton.enums.json ./crouton.enums.json
COPY --from=builder /app/data-sources ./data-sources
COPY --from=builder /app/${resDirSrc} ./resources
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE ${t.backendPort}
USER node
CMD ["node", "${backendDist}/main.js"]
`.trimStart();
};

const composeYml = (t: DockerTokens, includeFrontend: boolean): string => `
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
      - /app/node_modules

volumes:
  postgres_data:
`.trimStart();

export const buildDockerFiles = (
  t: DockerTokens,
  opts: { isNx: boolean; includeFrontend: boolean },
): AddFile[] => [
  { path: 'docker/Dockerfile.dev', contents: dockerfileDev(t, opts.isNx, opts.includeFrontend) },
  { path: 'docker/Dockerfile.prod', contents: dockerfileProd(t, opts.isNx, opts.includeFrontend) },
  { path: 'docker/compose.yml', contents: composeYml(t, opts.includeFrontend) },
  { path: 'docker/.dockerignore', contents: 'node_modules\ndist\n.git\n.env\n*.log\n' },
];
