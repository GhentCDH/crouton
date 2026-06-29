/**
 * Templates shared between regular and NX layouts.
 */

import type { Tokens } from '../lib/render.js';

// ── .gitignore ────────────────────────────────────────────────────────────────
export const gitignore = (): string => `
node_modules/
dist/
.env
*.log
.DS_Store
`.trim() + '\n';

// ── .env / .env.example ───────────────────────────────────────────────────────
export const envFile = (t: Tokens): string =>
  `DATABASE_URL="postgresql://crouton:crouton@localhost:5432/${t.dbName}?schema=public"\n`;

export const envExample = (t: Tokens): string =>
  `DATABASE_URL="postgresql://crouton:crouton@localhost:5432/${t.dbName}?schema=public"\n`;

// ── .nvmrc ────────────────────────────────────────────────────────────────────
export const nvmrc = (): string => '22\n';

// ── crouton.json (regular layout) ─────────────────────────────────────────────
export const croutonJson = (resourcesDir: string, dataSourcesDir: string): string =>
  JSON.stringify(
    {
      resourcesDir,
      dataSourcesDir,
      schemaExportName: '{Model}WithRelationsSchema',
      enumsFile: 'crouton.enums.json',
    },
    null,
    2,
  ) + '\n';

// ── crouton.enums.json ────────────────────────────────────────────────────────
export const croutonEnumsJson = (): string => '{}\n';

// ── prisma/schema.prisma ──────────────────────────────────────────────────────
export const prismaSchema = (zodOutput: string, sample: boolean): string => `
// Prisma 7: connection URL lives in prisma.config.ts — no 'url' in datasource.
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider = "zod-prisma-types"
  output   = "../${zodOutput}"
}
${sample ? `
model Note {
  id         Int      @id @default(autoincrement())
  title      String
  body       String?  @db.Text
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
` : ''}`.trimStart();

// ── prisma.config.ts ──────────────────────────────────────────────────────────
export const prismaConfig = (urlEnv: string, schemaPath = 'prisma/schema.prisma'): string => `
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: '${schemaPath}',
  datasource: {
    url: process.env['${urlEnv}']!,
  },
});
`.trimStart();

// ── data-source.json ──────────────────────────────────────────────────────────
export const dataSourceJson = (name: string, generatedImport: string, urlEnv: string, zodOutput: string): string =>
  JSON.stringify(
    {
      type: 'postgres',
      name,
      default: true,
      urlEnv,
      generatedTypesImport: generatedImport,
      zodOutput,
      prismaSchema: 'prisma/schema.prisma',
      prismaConfig: 'prisma.config.ts',
    },
    null,
    2,
  ) + '\n';

// ── data-sources/default/index.ts ─────────────────────────────────────────────
export const dataSourceIndex = (urlEnv: string): string => `
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['${urlEnv}']! });

export const prisma = new PrismaClient({ adapter });
`.trimStart();

// ── src/main.ts ───────────────────────────────────────────────────────────────
export const mainTs = (port: string): string => `
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors();
  await app.listen(${port}, '0.0.0.0');
  console.log(\`Server running on http://localhost:${port}\`);
}

bootstrap();
`.trimStart();

// ── src/app.module.ts (regular) ───────────────────────────────────────────────
export const appModuleRegular = (enumsFile = 'crouton.enums.json'): string => `
import { Module } from '@nestjs/common';
import { CroutonApiModule } from '@ghentcdh/crouton-api';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..', '..');

@Module({
  imports: [
    CroutonApiModule.forResourceDir(
      join(root, 'resources'),
      join(root, 'data-sources'),
      { enumsFile: join(root, '${enumsFile}') },
    ),
  ],
})
export class AppModule {}
`.trimStart();
