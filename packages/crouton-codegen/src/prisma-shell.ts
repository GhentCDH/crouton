/**
 * Thin wrappers around the project's Prisma CLI plus git/backup safety for the
 * destructive `db pull` step.
 *
 * Shared by both `crouton-cli` (interactive terminal) and `crouton-api`
 * (dev-mode endpoint). Only uses `node:child_process` / `node:fs` — no
 * framework-specific dependencies.
 */

import { spawn } from 'node:child_process';
import { type Dirent, existsSync } from 'node:fs';
import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/**
 * Load a .env file from `dir` (or the nearest parent that has one) into
 * `process.env` so that prisma commands inherit DATABASE_URL etc.
 * Uses Node ≥ 20.12 process.loadEnvFile — no dotenv dependency needed.
 * Does not override already-set env vars (process.loadEnvFile semantics).
 */
export const loadDotenv = (dir: string): void => {
  let d = dir;
  for (let i = 0; i < 6; i++) {
    const file = join(d, '.env');
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  if (!process.env['DATABASE_URL']) {
    console.warn('[crouton] No .env found and DATABASE_URL is not set — prisma commands may fail');
  }
};

/**
 * Resolve a CLI binary from the project's node_modules first, then fall back
 * to `npx <name>`. Prevents version mismatches where npx downloads a newer
 * major version that has different command names.
 */
const resolveBin = (name: string, cwd: string): [string, string[]] => {
  let d = cwd;
  for (let i = 0; i < 6; i++) {
    const bin = join(d, 'node_modules', '.bin', name);
    if (existsSync(bin)) return [bin, []];
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return ['npx', [name]];
};

const run = (
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32', env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => resolve({ code: 1, stdout, stderr: stderr + String(err) }));
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });

/** True when the given path has uncommitted changes (or git is unavailable → treated as clean). */
export const isGitDirty = async (cwd: string, path: string): Promise<boolean> => {
  const { code, stdout } = await run('git', ['status', '--porcelain', '--', path], cwd);
  if (code !== 0) return false; // not a git repo / git missing — don't block
  return stdout.trim().length > 0;
};

/** Back up a schema file to `<schema>.bak` before a destructive pull. */
export const backupSchema = async (schemaPath: string): Promise<string> => {
  const dest = `${schemaPath}.bak`;
  await copyFile(schemaPath, dest);
  return dest;
};

export interface PrismaRunResult {
  ok: boolean;
  output: string;
}

/** Introspect the live database into the schema file. */
export const prismaDbPull = async (cwd: string, prismaConfig: string): Promise<PrismaRunResult> => {
  const [bin, prefix] = resolveBin('prisma', cwd);
  const { code, stdout, stderr } = await run(bin, [...prefix, 'db', 'pull', '--config', prismaConfig], cwd);
  return { ok: code === 0, output: `${stdout}\n${stderr}`.trim() };
};

/** `prisma-case-format` — PascalCase models + camelCase fields with @@map/@map annotations. */
export const prismaCaseFormat = async (cwd: string, schemaPath: string): Promise<PrismaRunResult> => {
  // Resolve bin from crouton's own node_modules to avoid ad-hoc npx download failures
  let binPath: string | undefined;
  try {
    const _require = createRequire(import.meta.url);
    binPath = _require.resolve('prisma-case-format/bin/cli.js');
  } catch { /* fall back to npx */ }

  const [cmd, args] = binPath
    ? [process.execPath, [binPath, '--file', schemaPath]]
    : ['npx', ['prisma-case-format', '--file', schemaPath]];
  const { code, stdout, stderr } = await run(cmd, args, cwd);
  return { ok: code === 0, output: `${stdout}\n${stderr}`.trim() };
};

/** `prisma generate` for a datasource's config (triggers the `crouton-prisma` generator). */
export const prismaGenerate = async (cwd: string, prismaConfig: string): Promise<PrismaRunResult> => {
  const [bin, prefix] = resolveBin('prisma', cwd);
  const { code, stdout, stderr } = await run(bin, [...prefix, 'generate', '--config', prismaConfig], cwd);
  return { ok: code === 0, output: `${stdout}\n${stderr}`.trim() };
};

/**
 * zod-prisma-types sometimes omits `import { z } from 'zod'` in generated
 * schema files. Scan the output directory and inject the import where missing.
 */
export const fixZodImports = async (zodOutputDir: string): Promise<number> => {
  let fixed = 0;
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.ts')) {
        const src = await readFile(full, 'utf-8');
        if (src.includes('z.') && !src.includes('from \'zod\'') && !src.includes('from "zod"')) {
          await writeFile(full, `import { z } from 'zod';\n${src}`, 'utf-8');
          fixed++;
        }
      }
    }
  };
  await walk(zodOutputDir);
  return fixed;
};

/**
 * After zod-prisma-types generates multi-file output, two ESM issues can occur:
 * 1. `src/index.ts` imports subdirs as bare directories (`from './modelSchema'`)
 *    which fails in Node ESM strip-only mode — needs explicit `./modelSchema/index`.
 * 2. Subdir barrel files (`modelSchema/index.ts`) may be absent entirely.
 *
 * This walks the output tree, patches directory imports in each `index.ts`, and
 * creates any missing barrel file by re-exporting all `.ts` siblings.
 */
export const fixEsmBarrels = async (outputDir: string): Promise<void> => {
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    // Patch directory imports in index.ts
    const indexPath = join(dir, 'index.ts');
    if (existsSync(indexPath)) {
      let content = await readFile(indexPath, 'utf-8');
      let changed = false;
      for (const sub of subdirs) {
        const bare = `from './${sub}'`;
        const explicit = `from './${sub}/index'`;
        if (content.includes(bare)) {
          content = content.split(bare).join(explicit);
          changed = true;
        }
      }
      if (changed) await writeFile(indexPath, content, 'utf-8');
    }

    // Ensure each subdir has a barrel index.ts
    for (const sub of subdirs) {
      const subDir = join(dir, sub);
      const subIndex = join(subDir, 'index.ts');
      if (!existsSync(subIndex)) {
        let subEntries: Dirent[] = [];
        try {
          subEntries = await readdir(subDir, { withFileTypes: true });
        } catch { /* ignore */ }
        const barrel = subEntries
          .filter((e) => !e.isDirectory() && e.name.endsWith('.ts') && e.name !== 'index.ts')
          .map((e) => `export * from './${e.name.replace(/\.ts$/, '')}';`)
          .join('\n');
        await writeFile(subIndex, barrel ? `${barrel}\n` : '', 'utf-8');
      }
      await walk(subDir);
    }
  };
  await walk(outputDir);
};

export interface PullAndGenerateInput {
  root: string;
  prismaConfigPath: string;
  schemaPath: string;
}

export interface PullAndGenerateResult {
  ok: boolean;
  backupPath: string;
  dbPull: PrismaRunResult;
  caseFormat?: PrismaRunResult;
  normalizeSchema?: { ok: boolean; renamed: number };
  generate?: PrismaRunResult;
}

/**
 * Full pull-and-generate pipeline: backup → dbPull → caseFormat →
 * normalizeSchema → generate.
 *
 * Returns a structured result; callers handle UI / error presentation.
 * `dbPull` failure is fatal (returns early with `ok: false`); subsequent
 * step failures are recorded but non-fatal.
 *
 * zod post-processing (fixZodImports) is now owned by the crouton-prisma
 * generator and runs inside `prismaGenerate`.
 */
export const pullAndGenerate = async (
  input: PullAndGenerateInput,
): Promise<PullAndGenerateResult> => {
  const { root, prismaConfigPath, schemaPath } = input;
  loadDotenv(dirname(schemaPath));
  const backupPath = await backupSchema(schemaPath);
  const dbPull = await prismaDbPull(root, prismaConfigPath);
  if (!dbPull.ok) return { ok: false, backupPath, dbPull };
  const caseFormat = await prismaCaseFormat(root, schemaPath);
  const normalized = await normalizeSchema(schemaPath);
  const generate = await prismaGenerate(root, prismaConfigPath);
  return { ok: true, backupPath, dbPull, caseFormat, normalizeSchema: { ok: true, renamed: normalized.renamed }, generate };
};

interface NormalizeConfig {
  renames: Record<string, Record<string, string>>;
}

/**
 * Rename ugly auto-generated relation field names in a Prisma schema using a
 * `normalize-schema.json` config file placed next to the schema.
 */
export const normalizeSchema = async (
  schemaPath: string,
  configDir?: string,
): Promise<{ renamed: number }> => {
  const dir = configDir ?? dirname(schemaPath);
  const configPath = join(dir, 'normalize-schema.json');

  if (!existsSync(configPath)) return { renamed: 0 };

  const config: NormalizeConfig = JSON.parse(
    await readFile(configPath, 'utf-8'),
  );
  let schema = await readFile(schemaPath, 'utf-8');
  let renamed = 0;

  for (const [modelName, fields] of Object.entries(config.renames)) {
    // Match the model block: `model ModelName { ... }`
    const modelRe = new RegExp(
      `(model\\s+${modelName}\\s*\\{)(.*?)(^})`,
      'ms',
    );
    schema = schema.replace(modelRe, (_, head: string, body: string, tail: string) => {
      for (const [ugly, clean] of Object.entries(fields)) {
        // Replace field name at start of line (after optional whitespace)
        const fieldRe = new RegExp(`^(\\s+)${ugly}\\b`, 'gm');
        const replaced = body.replace(fieldRe, `$1${clean}`);
        if (replaced !== body) {
          body = replaced;
          renamed++;
        }
      }
      return `${head}${body}${tail}`;
    });
  }

  if (renamed > 0) {
    await writeFile(schemaPath, schema, 'utf-8');
  }

  return { renamed };
};