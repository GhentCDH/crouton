/**
 * Pure scaffolder for a new datasource: given the desired settings, produce the
 * full set of files (project-root-relative paths + contents) that make a
 * datasource self-describing and ready for `crouton update resources`.
 *
 * No disk I/O — the CLI (or a backend dev endpoint) collects the inputs, calls
 * this, and writes the returned files. Every generated datasource gets its own
 * Prisma schema, Prisma client output, and zod output so multiple datasources
 * never collide (the Prisma-7 multi-datasource requirement).
 */

import { defaultPrismaConfig } from './config';
import { dirname, posix, relative } from 'node:path';


export interface DatasourceScaffoldOptions {
  /** Datasource name (folder + `name` in data-source.json). */
  name: string;
  /** Where datasource folders live, relative to project root (from crouton.json). */
  dataSourcesDir: string;
  /**
   * Env var holding the connection URL. Required for Prisma; optional for
   * custom adapters whose connection config may not use an env var.
   */
  urlEnv?: string;
  /**
   * Adapter kind. `"prisma"` (default) generates the full Prisma scaffold;
   * `"custom"` emits only `data-source.json` + an `index.ts` adapter stub.
   */
  adapter?: 'prisma' | 'custom';
  /** Import path for this datasource's generated Zod types (for resource `schema.ts`). Prisma only. */
  generatedTypesImport?: string;
  /** Import path for this datasource's generated Prisma client. When set, used instead of a relative path in data-source index.ts. */
  generatedClientImport?: string;
  /** Datasource type tag. Default `postgres`. */
  type?: string;
  /** Mark this as the default datasource. Default `false`. */
  default?: boolean;
  /** Prisma schema path, relative to project root. Default `prisma/<name>/schema.prisma`. */
  prismaSchema?: string;
  /** Prisma config path, relative to project root. Default `prisma/<name>/prisma.config.ts`. */
  prismaConfig?: string;
  /** zod-prisma-types output dir, relative to project root. Default `generated/<name>/src`. */
  zodOutput?: string;
  /** Prisma client output dir, relative to project root. Default `generated/<name>/client`. */
  clientOutput?: string;
}

export interface ScaffoldFile {
  /** Path relative to the project root. */
  path: string;
  contents: string;
}

export interface DatasourceScaffold {
  files: ScaffoldFile[];
  /** The fully-resolved settings (after defaults), e.g. for printing a summary. */
  resolved: {
    name: string;
    adapter: 'prisma' | 'custom';
    default: boolean;
    urlEnv?: string;
    type?: string;
    generatedTypesImport?: string;
    prismaSchema?: string;
    prismaConfig?: string;
    zodOutput?: string;
    clientOutput?: string;
  };
  notes: string[];
}

const PRISMA_PROVIDERS: Record<string, string> = {
  postgres: 'postgresql',
  postgresql: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mysql',
  sqlite: 'sqlite',
  sqlserver: 'sqlserver',
  mssql: 'sqlserver',
  mongodb: 'mongodb',
  cockroachdb: 'cockroachdb',
};

/** Posix-style relative import from one project-relative dir/file to another dir. */
const relImport = (fromDir: string, toDir: string): string => {
  const rel = relative(fromDir, toDir).split(/[\\/]/).join(posix.sep);
  return rel.startsWith('.') ? rel : `./${rel}`;
};

export const buildDatasourceFiles = (opts: DatasourceScaffoldOptions): DatasourceScaffold => {
  const name = opts.name;
  const isDefault = opts.default === true;
  const adapter = opts.adapter ?? 'prisma';
  const dsDir = posix.join(opts.dataSourcesDir, name);

  // ── Custom adapter path ───────────────────────────────────────────────────
  if (adapter === 'custom') {
    const dataSourceJson: Record<string, unknown> = {
      adapter: 'custom',
      name,
      ...(opts.urlEnv ? { urlEnv: opts.urlEnv } : {}),
      ...(isDefault ? { default: true } : {}),
    };

    const indexTs = `import type { DataSourceAdapter } from '@ghentcdh/crouton-api';

const adapter: DataSourceAdapter = {
  kind: 'custom',

  supports(_model: string): boolean {
    return true;
  },

  async disconnect(): Promise<void> {
    // clean up connections
  },
};

export default adapter;
`;

    const notes: string[] = [];
    if (opts.urlEnv) notes.push(`Add ${opts.urlEnv} to your .env (and .env.example).`);
    notes.push(`Implement your DataSourceAdapter in ${posix.join(dsDir, 'index.ts')}.`);

    return {
      files: [
        { path: posix.join(dsDir, 'data-source.json'), contents: `${JSON.stringify(dataSourceJson, null, 2)}\n` },
        { path: posix.join(dsDir, 'index.ts'), contents: indexTs },
      ],
      resolved: { name, urlEnv: opts.urlEnv, adapter: 'custom', default: isDefault },
      notes,
    };
  }

  // ── Prisma adapter path (default) ─────────────────────────────────────────
  const type = opts.type ?? 'postgres';
  const provider = PRISMA_PROVIDERS[type.toLowerCase()] ?? 'postgresql';

  const prismaSchema = opts.prismaSchema ?? `prisma/${name}/schema.prisma`;
  const prismaConfig = opts.prismaConfig ?? defaultPrismaConfig(name);
  const zodOutput = opts.zodOutput ?? `generated/${name}/src`;
  const clientOutput = opts.clientOutput ?? `generated/${name}/client`;

  const schemaDir = dirname(prismaSchema);
  const migrationsDir = posix.join(schemaDir, 'migrations');

  // ── data-source.json ──────────────────────────────────────────────────────
  const dataSourceJson: Record<string, unknown> = {
    type,
    name,
    ...(isDefault ? { default: true } : {}),
    prismaSchema,
    urlEnv: opts.urlEnv,
    generatedTypesImport: opts.generatedTypesImport,
    zodOutput,
    clientOutput,
    prismaConfig,
  };

  // ── index.ts (runtime PrismaClient) ───────────────────────────────────────
  const clientImport = opts.generatedClientImport ?? relImport(dsDir, clientOutput);
  const indexTs = `import { PrismaClient } from '${clientImport}';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.${opts.urlEnv} ?? '';
// ?schema=<name> in the URL is a Prisma extension; pg ignores it — set search_path explicitly.
const _schema = new URLSearchParams((connectionString.split('?')[1]) ?? '').get('schema');

const adapter = new PrismaPg({
  connectionString,
  ...(_schema && _schema !== 'public' ? { options: \`--search_path=\${_schema}\` } : {}),
});
const client = new PrismaClient({ adapter });

export default client;
`;

  // ── prisma/<name>/schema.prisma ───────────────────────────────────────────
  const relClient = relImport(schemaDir, clientOutput);
  const relZod = relImport(schemaDir, zodOutput);
  const schemaPrisma = `generator client {
  provider = "prisma-client-js"
  output   = "${relClient}"
}

generator zod {
  provider                         = "zod-prisma-types"
  output                           = "${relZod}"
  addInputTypeValidation           = "false"
  createInputTypes                 = "false"
  createModelTypes                 = "true"
  createOptionalDefaultValuesTypes = "false"
  createRelationValuesTypes        = "true"
  useMultipleFiles                 = "true"
  writeBarrelFiles                 = "true"
}

datasource db {
  provider = "${provider}"
  // url is provided by ${prismaConfig} (Prisma 7 forbids \`url\` here)
}
`;

  // ── prisma/<name>/prisma.config.ts ────────────────────────────────────────
  // Paths must be relative to the config file, not the project root.
  const configDir = dirname(prismaConfig);
  const relSchema = relImport(configDir, prismaSchema);
  const relMigrations = relImport(configDir, migrationsDir);

  const prismaConfigTs = `// Generated by \`crouton create-datasource\`.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: '${relSchema}',
  migrations: {
    path: '${relMigrations}',
  },
  datasource: {
    url: env('${opts.urlEnv}'),
  },
});
`;

  const files: ScaffoldFile[] = [
    { path: posix.join(dsDir, 'data-source.json'), contents: `${JSON.stringify(dataSourceJson, null, 2)}\n` },
    { path: posix.join(dsDir, 'index.ts'), contents: indexTs },
    { path: prismaSchema, contents: schemaPrisma },
    { path: prismaConfig, contents: prismaConfigTs },
  ];

  const notes = [
    `Add ${opts.urlEnv} to your .env (and .env.example).`,
    `Map ${opts.generatedTypesImport} to ${zodOutput} in your tsconfig paths / workspace.`,
    `Run \`crouton update resources --datasource ${name}\` to introspect and generate resources.`,
  ];

  return {
    files,
    resolved: { name, type, adapter: 'prisma', default: isDefault, urlEnv: opts.urlEnv, generatedTypesImport: opts.generatedTypesImport, prismaSchema, prismaConfig, zodOutput, clientOutput },
    notes,
  };
};
