import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { type PackageManager, detectPackageManager } from './lib/detect';
import { type FileEntry, fileExists, writeFiles } from './lib/files';
import { pmExec } from './lib/pm';
import { CancelledError, assertNotCancel } from './lib/prompts';
import {
  buildTokens,
  datasourceFiles,
  loadAndRenderTemplates,
  renderDockerTemplates,
  resolveTemplateDir,
} from './runner';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

export interface CreateProjectOptions {
  /** Codespace root (defaults to process.cwd()). */
  cwd?: string;
  /** Nx only: include a Vue frontend app. */
  frontend?: boolean;
  dbUrl?: string;
  docker?: boolean;
  backendPort?: number;
  frontendPort?: number;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
}

/** A change to a file that already exists at the codespace root. */
export interface RootEdit {
  path: string;
  /** Returns the new contents, or `undefined` when nothing needs to change. */
  apply: (contents: string) => string | undefined;
}

const NAME_RE = /^[a-z][a-z0-9-]*$/;

/** Ports already claimed by `.env` / `compose.app.*.yml` files at the root and one level below. */
export const detectUsedPorts = async (root: string): Promise<Set<number>> => {
  // The first project of a codespace runs on the defaults, written or not.
  const used = new Set<number>([3000, 4200]);
  const dirs = [root, ...(await readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => join(root, e.name))];
  for (const dir of dirs) {
    for (const file of await readdir(dir)) {
      if (file !== '.env' && !/^compose\.app\..+\.yml$/.test(file)) continue;
      const text = await readFile(join(dir, file), 'utf-8');
      for (const m of text.matchAll(/PORT\D{0,3}(\d{2,5})/g)) used.add(Number(m[1]));
    }
  }
  return used;
};

export const nextFreePort = (start: number, used: Set<number>): number => {
  let port = start;
  while (used.has(port)) port += 1;
  return port;
};

/** Root files a new Nx project has to be registered in. Missing files are skipped. */
export const nxRootEdits = (root: string, name: string): RootEdit[] => [
  {
    path: join(root, 'pnpm-workspace.yaml'),
    apply: (text) => {
      const globs = [`${name}/apps/*`, `${name}/generated/**`].filter((g) => !text.includes(`- ${g}`));
      if (!globs.length) return undefined;
      return text.replace(/^packages:\n/m, (m) => m + globs.map((g) => `  - ${g}\n`).join(''));
    },
  },
  {
    path: join(root, 'tsconfig.base.json'),
    apply: (text) => {
      const json = JSON.parse(text) as { compilerOptions?: { paths?: Record<string, string[]> } };
      const paths = ((json.compilerOptions ??= {}).paths ??= {});
      const alias = `@${name}/generated-default-types`;
      if (paths[alias]) return undefined;
      Object.assign(paths, {
        [alias]: [`./${name}/generated/default/types/src`],
        [`${alias}/*`]: [`./${name}/generated/default/types/src/*`],
        [`@${name}/generated-default-client`]: [`./${name}/generated/default/client`],
        [`@${name}/generated-default-client/*`]: [`./${name}/generated/default/client/*`],
      });
      return `${JSON.stringify(json, null, 2)}\n`;
    },
  },
  {
    path: join(root, 'compose.yml'),
    apply: (text) => {
      const line = `  - compose.app.${name}.yml`;
      if (text.includes(line)) return undefined;
      return `${text.replace(/\n*$/, '\n')}${line}\n`;
    },
  },
];

/** Name of the codespace: `@<x>/workspace` → `<x>` for Nx, else the root package name or folder name. */
const codespaceName = async (root: string): Promise<string> => {
  try {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf-8')) as { name?: string };
    if (pkg.name) return pkg.name.replace(/^@([^/]+)\/workspace$/, '$1').replace(/^@[^/]+\//, '');
  } catch {
    // no package.json → folder name
  }
  return basename(root);
};

const detectLayout = async (root: string): Promise<'nx' | 'regular'> => {
  if (await fileExists(join(root, 'nx.json'))) return 'nx';
  if ((await fileExists(join(root, 'package.json'))) && (await fileExists(join(root, 'crouton.json')))) return 'regular';
  throw new Error(`${root} is not a crouton codespace (no nx.json, or package.json + crouton.json). Start one with \`npx @ghentcdh/create-crouton\`.`);
};

const resolveName = async (name: string | undefined, opts: CreateProjectOptions): Promise<string> => {
  if (name) {
    if (!NAME_RE.test(name)) throw new Error(`Invalid project name "${name}". Use lowercase letters, digits and dashes, starting with a letter.`);
    return name;
  }
  if (opts.yes) throw new Error('Pass a project name: `crouton create project <name>`.');
  return assertNotCancel<string>(
    await clack.text({
      message: 'Project name',
      placeholder: 'e.g. archive',
      validate: (v) => (v && NAME_RE.test(v) ? undefined : 'Lowercase letters, digits and dashes, starting with a letter.'),
    }),
  );
};

/**
 * Add a project to an existing crouton codespace (`crouton create project <name>`).
 * Renders the same templates as `create-crouton` into `<root>/<name>/`, without any
 * workspace bootstrapping (no root config, git init or install).
 *  - Nx: an extra workspace under `<name>/` (like `create-crouton --prefix`), registered in
 *    pnpm-workspace.yaml, tsconfig.base.json and compose.yml; free ports picked automatically.
 *  - Regular: a standalone NestJS app in `<name>/` with its own package.json and Docker files.
 */
export const runCreateProject = async (nameArg: string | undefined, opts: CreateProjectOptions): Promise<void> => {
  const root = resolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('crouton create project'));

  try {
    const layout = await detectLayout(root);
    const name = await resolveName(nameArg, opts);
    const targetDir = join(root, name);
    if (!opts.force && existsSync(targetDir) && (await readdir(targetDir)).length > 0) {
      throw new Error(`Directory "${name}" already exists and is not empty. Use --force to overwrite.`);
    }

    const pm: PackageManager = (await detectPackageManager(root)) ?? 'pnpm';
    const frontend =
      layout === 'nx' &&
      (opts.frontend ??
        (opts.yes || assertNotCancel<boolean>(await clack.confirm({ message: 'Include a Vue frontend app?', initialValue: true }))));
    const dbUrl =
      opts.dbUrl ??
      (opts.yes
        ? ''
        : assertNotCancel<string>(
            await clack.text({
              message: 'Database URL (leave empty for a database named after the project on localhost)',
              placeholder: 'postgresql://user:pass@localhost:5432/mydb?schema=public',
              defaultValue: '',
            }),
          ).trim());

    const used = await detectUsedPorts(root);
    const backendPort = opts.backendPort ?? nextFreePort(3000, used);
    const frontendPort = opts.frontendPort ?? nextFreePort(4200, used);

    const tokens = buildTokens({
      name,
      layout,
      prefix: layout === 'nx' ? name : undefined,
      frontend,
      postgres: false,
      dbUrl,
      pm,
      network: await codespaceName(root),
      backendPort,
      frontendPort,
    });

    const templateRoot = resolveTemplateDir();
    const files: FileEntry[] = await loadAndRenderTemplates(
      join(templateRoot, layout === 'nx' ? 'nx/workspace' : 'regular'),
      '',
      tokens,
      targetDir,
      frontend ? [] : ['apps/frontend'],
    );
    files.push(...datasourceFiles(layout, name, targetDir));

    if (opts.docker !== false) {
      // Nx: compose.app.<name>.yml at the root next to the others, Dockerfiles in <name>/;
      // the shared compose.yml / .dockerignore stay as they are (compose.yml gets an include).
      // Regular: a self-contained docker setup inside <name>/.
      const composeRoot = layout === 'nx' ? root : targetDir;
      const docker = await renderDockerTemplates(templateRoot, tokens, composeRoot, targetDir, { postgres: false });
      files.push(
        ...(layout === 'nx'
          ? docker.filter((f) => f.path !== join(root, 'compose.yml') && f.path !== join(root, '.dockerignore'))
          : docker),
      );
    }

    const edits: { path: string; contents: string }[] = [];
    if (layout === 'nx') {
      for (const edit of nxRootEdits(root, name)) {
        if (!existsSync(edit.path)) continue;
        if (edit.path.endsWith('compose.yml') && opts.docker === false) continue;
        try {
          const next = edit.apply(await readFile(edit.path, 'utf-8'));
          if (next !== undefined) edits.push({ path: edit.path, contents: next });
        } catch {
          clack.log.warn(`Could not update ${relative(root, edit.path)} — register ${name}/ there by hand.`);
        }
      }
    }

    const rel = (p: string) => relative(root, p);
    if (opts.dryRun) {
      clack.log.message(
        [...files.map((f) => `+ ${rel(f.path)}`), ...edits.map((e) => `~ ${rel(e.path)}`)].join('\n'),
      );
      clack.outro(`Dry run — ${files.length} file(s) to add, ${edits.length} to update. No files written.`);
      return;
    }

    const written = await writeFiles(files, { force: opts.force });
    for (const e of edits) await writeFile(e.path, e.contents, 'utf-8');
    clack.log.success(
      `Wrote ${written} file(s) to ${pc.cyan(`${name}/`)}${edits.length ? `, updated ${edits.map((e) => rel(e.path)).join(', ')}` : ''}.`,
    );

    const crouton = pmExec(pm, 'crouton');
    const pmRun = pm === 'npm' ? 'npm run' : pm;
    clack.note(
      (layout === 'nx'
        ? [
            `${pm} install                                  # link the new workspace packages`,
            `${crouton} update resources --project ${name}   # needs DATABASE_URL in ${name}/.env`,
            `${pmRun} nx run ${name}-backend:serve${frontend ? ` / ${name}-frontend:dev` : ''}`,
          ]
        : [
            `cd ${name} && ${pm} install`,
            `${crouton} update resources                  # needs DATABASE_URL in .env`,
            `${pmRun} dev`,
          ]
      ).join('\n') + `\n\nPorts: backend ${backendPort}${frontend ? `, frontend ${frontendPort}` : ''}.`,
      'Next steps',
    );
    clack.outro(pc.green(`Project ${name} added.`));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
