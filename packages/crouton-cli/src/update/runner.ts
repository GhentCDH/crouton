/**
 * `crouton update resources` orchestrator.
 *
 * Flow: load/scaffold config → pick datasource → (db pull → generate) →
 * introspect → pick models → build diffs → resolve (interactive or auto) →
 * preview → confirm → commit. All heavy lifting lives in the pure
 * `@ghentcdh/crouton-codegen` engine; this module is just the interactive shell.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import {
  type ApplyContext,
  type DbModel,
  type EnumRegistry,
  type LoadedConfig,
  type ResolvedDiff,
  type ResourceDiff,
  type WritePlan,
  apply,
  buildEnumRegistry,
  buildResourceDiffs,
  commit,
  fixZodImports,
  introspect,
  isGitDirty,
  loadConfig,
  loadDatasources,
  makeRelationResolver,
  makeSchemaExportName,
  mergeEnumRegistry,
  prismaGenerate,
  pullAndGenerate,
  readExistingResource,
  recommendedResolver,
  resolve as resolveDiff,
  resolveDatasource,
  resolveFromRoot,
  resolveRuleset,
  resourceNames,
  scaffoldConfigFromProject,
  serializeEnumRegistry,
} from '@ghentcdh/crouton-codegen';
import { type DataSource } from '@ghentcdh/crouton-core';

import { formatResourceChange } from './preview';
import { CancelledError, interactiveResolver } from './resolver';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve as pathResolve } from 'node:path';

export interface UpdateResourcesOptions {
  cwd?: string;
  datasource?: string;
  models?: string;
  dryRun?: boolean;
  yes?: boolean;
  skipPull?: boolean;
  skipGenerate?: boolean;
  /**
   * Write newly-scaffolded resources with `draft: true`. Set explicitly via `--draft`;
   * when omitted and this run is creating new resources, the CLI asks interactively
   * (default answer: no). Non-interactive (`-y`) runs default to `false`.
   */
  draft?: boolean;
}

/**
 * Ensure the generated types/client directories contain a `package.json` so
 * they can be resolved as workspace packages. Created only when absent.
 */
const ensureGeneratedScaffold = async (
  root: string,
  ds: DataSource,
  projectName: string,
): Promise<number> => {
  let created = 0;

  const scaffoldPkg = async (dir: string, name: string, opts: { isClient?: boolean; addZod?: boolean } = {}) => {
    const pkgPath = join(dir, 'package.json');
    await mkdir(dir, { recursive: true });

    if (existsSync(pkgPath)) {
      // Prisma may have written its own package.json — ensure name + private are set
      const existing = JSON.parse(await readFile(pkgPath, 'utf-8'));
      if (existing.name !== name) {
        existing.name = name;
        existing.private = true;
        await writeFile(pkgPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
        created++;
      }
      return;
    }

    const entry = opts.isClient ? './index.js' : './src/index.ts';
    const wildcard = opts.isClient ? './*' : './src/*';
    const pkg: Record<string, unknown> = {
      name,
      version: '0.0.1',
      private: true,
      main: entry,
      exports: { '.': entry, './*': wildcard },
      ...(opts.addZod ? { dependencies: { tslib: '^2.8.0', zod: '^4.0.0' } } : {}),
    };
    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
    created++;
  };

  if (ds.zodOutput) {
    const typesDir = resolveFromRoot(root, dirname(ds.zodOutput));
    await scaffoldPkg(typesDir, `@${projectName}/generated-${ds.name}-types`, { addZod: true });
  }
  if (ds.clientOutput) {
    const clientDir = resolveFromRoot(root, ds.clientOutput);
    await scaffoldPkg(clientDir, `@${projectName}/generated-${ds.name}-client`, { isClient: true });
  }
  return created;
};

/**
 * Ensure every app `package.json` under `apps/` lists workspace deps for the
 * generated types (and client for backend apps). Adds missing entries only.
 */
const ensureAppWorkspaceDeps = async (
  root: string,
  ds: DataSource,
  projectName: string,
): Promise<number> => {
  const appsDir = join(root, 'apps');
  if (!existsSync(appsDir)) return 0;

  let patched = 0;
  const entries = await readdir(appsDir, { withFileTypes: true });

  const typesName = `@${projectName}/generated-${ds.name}-types`;
  const clientName = `@${projectName}/generated-${ds.name}-client`;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgPath = join(appsDir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;

    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    const deps: Record<string, string> = pkg.dependencies ?? {};
    const allDeps = { ...deps, ...(pkg.devDependencies ?? {}) };
    let changed = false;

    // Types dep — needed by both frontend and backend
    if (ds.zodOutput && !allDeps[typesName]) {
      deps[typesName] = 'workspace:*';
      changed = true;
    }

    // Client dep — only for backend apps (has @nestjs/core or @prisma/client)
    const isBackend = '@nestjs/core' in allDeps || '@prisma/client' in allDeps;
    if (ds.clientOutput && isBackend && !allDeps[clientName]) {
      deps[clientName] = 'workspace:*';
      changed = true;
    }

    if (changed) {
      pkg.dependencies = Object.fromEntries(
        Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)),
      );
      await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
      patched++;
    }
  }

  return patched;
};

const assertNotCancel = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) throw new CancelledError();
  return value as T;
};

const loadOrScaffoldConfig = async (
  cwd: string,
  yes: boolean,
): Promise<LoadedConfig> => {
  try {
    return await loadConfig(cwd);
  } catch {
    clack.log.warn('No crouton.json found.');
    const { config, datasources, notes } = await scaffoldConfigFromProject(cwd);
    for (const n of notes) clack.log.info(n);
    clack.log.message(pc.dim(JSON.stringify(config, null, 2)));
    const write = yes
      ? true
      : assertNotCancel(
          await clack.confirm({
            message: 'Write this crouton.json (+ data-source.json files)?',
            initialValue: true,
          }),
        );
    if (!write) throw new CancelledError();

    const path = join(cwd, 'crouton.json');
    await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
    // Write a self-describing data-source.json per discovered/proposed datasource.
    for (const { folder, ...ds } of datasources) {
      const dsPath = join(
        cwd,
        config.dataSourcesDir,
        folder,
        'data-source.json',
      );
      await mkdir(dirname(dsPath), { recursive: true });
      await writeFile(dsPath, `${JSON.stringify(ds, null, 2)}\n`, 'utf-8');
    }
    clack.log.success(`Wrote ${path} + ${datasources.length} data-source.json`);
    return { config, path, root: cwd };
  }
};

const pickDatasource = async (
  datasources: DataSource[],
  requested: string | undefined,
  yes: boolean,
): Promise<DataSource> => {
  const hasDefault = datasources.some((d) => d.default);
  if (requested || datasources.length === 1 || hasDefault) {
    return resolveDatasource(datasources, requested);
  }
  if (yes) return resolveDatasource(datasources, datasources[0]?.name);
  const chosen = assertNotCancel(
    await clack.select({
      message: 'Which datasource?',
      options: datasources.map((d) => ({ value: d.name, label: d.name })),
    }),
  ) as string;
  return resolveDatasource(datasources, chosen);
};

const pickModels = async (
  models: DbModel[],
  filter: string | undefined,
  loaded: LoadedConfig,
  yes: boolean,
): Promise<DbModel[]> => {
  if (filter) {
    const wanted = new Set(
      filter
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    return models.filter(
      (m) =>
        wanted.has(m.prismaName) ||
        wanted.has(resourceNames(m.prismaName).name),
    );
  }
  if (yes) return models;
  const existing = new Set(
    (
      await Promise.all(
        models.map((m) =>
          readExistingResource(loaded, resourceNames(m.prismaName).name),
        ),
      )
    ).flatMap((r, i) => (r.config ? [models[i].prismaName] : [])),
  );
  const selected = assertNotCancel(
    await clack.multiselect({
      message: 'Select models to generate / update',
      options: models.map((m) => ({
        value: m.prismaName,
        label: resourceNames(m.prismaName).name,
        hint: existing.has(m.prismaName) ? 'existing' : 'new',
      })),
      initialValues: models.map((m) => m.prismaName),
      required: false,
    }),
  ) as string[];
  return models.filter((m) => selected.includes(m.prismaName));
};

/**
 * Resolve whether newly-scaffolded resources are written with `draft: true`.
 *
 * - An explicit `--draft` always wins.
 * - No new resources in this run → nothing to ask about, `false`.
 * - `-y` (non-interactive) → defaults to `false`.
 * - Otherwise ask interactively, defaulting the answer to "No".
 */
const resolveDraftOption = async (
  opts: Pick<UpdateResourcesOptions, 'draft' | 'yes'>,
  diffs: ResourceDiff[],
): Promise<boolean> => {
  if (opts.draft !== undefined) return opts.draft;
  if (!diffs.some((d) => d.isNew)) return false;
  if (opts.yes) return false;
  return assertNotCancel(
    await clack.confirm({
      message: 'Write newly-created resources as draft (hidden until reviewed)?',
      initialValue: false,
    }),
  );
};

export const runUpdateResources = async (
  opts: UpdateResourcesOptions,
): Promise<void> => {
  const cwd = pathResolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('crouton update resources'));

  try {
    const loaded = await loadOrScaffoldConfig(cwd, !!opts.yes);
    const datasources = await loadDatasources(loaded);
    const ds = await pickDatasource(datasources, opts.datasource, !!opts.yes);
    const schemaAbs = resolveFromRoot(loaded.root, ds.prismaSchema);
    const configAbs = resolveFromRoot(loaded.root, ds.prismaConfig);

    if (!opts.skipPull) {
      if (await isGitDirty(loaded.root, schemaAbs)) {
        const cont = opts.yes
          ? true
          : assertNotCancel(
              await clack.confirm({
                message: `${ds.prismaSchema} has uncommitted changes; \`db pull\` will overwrite it. Continue?`,
                initialValue: false,
              }),
            );
        if (!cont) throw new CancelledError();
      }

      const spin = clack.spinner();
      spin.start(`prisma db pull + generate (${ds.name})`);
      const zodDir = ds.zodOutput ? resolveFromRoot(loaded.root, ds.zodOutput) : undefined;
      const result = await pullAndGenerate({
        root: loaded.root,
        prismaConfigPath: configAbs,
        schemaPath: schemaAbs,
        zodOutputDir: zodDir,
      });
      spin.stop(result.ok ? 'Pull + generate complete' : 'db pull failed');

      if (!result.ok) {
        clack.log.error(result.dbPull.output);
        throw new CancelledError();
      }
      if (result.caseFormat && !result.caseFormat.ok) {
        clack.log.warn(result.caseFormat.output);
      }
      if (result.normalizeSchema && result.normalizeSchema.renamed > 0) {
        clack.log.info(`Normalized ${result.normalizeSchema.renamed} relation field name(s)`);
      }
      if (result.generate && !result.generate.ok) {
        clack.log.warn(result.generate.output);
      }
      if (result.zodImportsFixed && result.zodImportsFixed > 0) {
        clack.log.info(`Patched ${result.zodImportsFixed} file(s) with missing zod import`);
      }
    }

    // Generate-only path (pull was skipped but generate wasn't).
    if (!opts.skipGenerate && opts.skipPull) {
      const spin = clack.spinner();
      spin.start('prisma generate');
      const gen = await prismaGenerate(loaded.root, configAbs);
      spin.stop(gen.ok ? 'Types generated' : 'generate failed (continuing)');
      if (!gen.ok) clack.log.warn(gen.output);

      if (gen.ok && ds.zodOutput) {
        const zodDir = resolveFromRoot(loaded.root, ds.zodOutput);
        const patched = await fixZodImports(zodDir);
        if (patched > 0) {
          clack.log.info(`Patched ${patched} file(s) with missing zod import`);
        }
      }
    }

    // CLI-only scaffold steps (independent of pull vs generate-only).
    if (!opts.skipGenerate) {
      const projectName = loaded.config.title?.toLowerCase().replace(/\s+/g, '-') ?? 'app';
      const scaffolded = await ensureGeneratedScaffold(loaded.root, ds, projectName);
      if (scaffolded > 0) {
        clack.log.info(`Created ${scaffolded} scaffold file(s) in generated dirs`);
      }
      const depsPatched = await ensureAppWorkspaceDeps(loaded.root, ds, projectName);
      if (depsPatched > 0) {
        clack.log.info(`Added generated workspace deps to ${depsPatched} app(s)`);
      }
    }

    const allModels = await introspect({ schemaPath: schemaAbs });
    const models = await pickModels(allModels, opts.models, loaded, !!opts.yes);
    if (models.length === 0) {
      clack.outro('No models selected — nothing to do.');
      return;
    }

    // Shared enum registry: collect from the selected models and merge into the
    // existing crouton.enums.json (preserving hand-edited labels).
    const enumsRel = loaded.config.enumsFile ?? 'crouton.enums.json';
    const enumsPath = resolveFromRoot(loaded.root, enumsRel);
    let existingEnums: EnumRegistry = {};
    try {
      existingEnums = JSON.parse(
        await readFile(enumsPath, 'utf-8'),
      ) as EnumRegistry;
    } catch {
      /* no registry yet */
    }
    const mergedEnums = mergeEnumRegistry(
      existingEnums,
      buildEnumRegistry(models),
    );
    const enumsChanged =
      serializeEnumRegistry(mergedEnums) !==
      serializeEnumRegistry(existingEnums);

    const resolveRelationResource = await makeRelationResolver(loaded);
    const diffs = await buildResourceDiffs(models, {
      database: ds.name,
      ruleset: resolveRuleset(loaded.config),
      resolveRelationResource,
      readExisting: (name) => readExistingResource(loaded, name),
    });

    const draft = await resolveDraftOption(opts, diffs);

    const applyCtx: ApplyContext = {
      resourcesDir: resolveFromRoot(loaded.root, loaded.config.resourcesDir),
      generatedTypesImport: ds.generatedTypesImport,
      schemaExportName: makeSchemaExportName(loaded.config),
      draft,
    };
    const resolver = opts.yes ? recommendedResolver : interactiveResolver;

    const all: { resolved: ResolvedDiff; plan: WritePlan }[] = [];
    for (const diff of diffs) {
      const resolved = await resolveDiff(diff, resolver);
      all.push({ resolved, plan: apply(resolved, applyCtx) });
    }
    // Only surface resources that actually changed — adjusted files only.
    const changes = all.filter(
      (c) => c.plan.files.length > 0 || c.plan.notes.length > 0,
    );

    if (changes.length === 0 && !enumsChanged) {
      clack.outro(pc.green('Everything is up to date — nothing to write.'));
      return;
    }

    const previewLines = changes.map((c) => formatResourceChange(c));
    if (enumsChanged) {
      previewLines.push(
        pc.cyan(`~ ${enumsRel} (${Object.keys(mergedEnums).length} enum(s))`),
      );
    }
    clack.log.message(previewLines.join('\n'));

    if (opts.dryRun) {
      clack.outro(pc.yellow('Dry run — no files written.'));
      return;
    }

    const fileCount =
      changes.reduce((n, c) => n + c.plan.files.length, 0) +
      (enumsChanged ? 1 : 0);
    const go = opts.yes
      ? true
      : assertNotCancel(
          await clack.confirm({
            message: `Write ${fileCount} file(s)?`,
            initialValue: true,
          }),
        );
    if (!go) throw new CancelledError();

    let written = 0;
    let skipped = 0;
    for (const c of changes) {
      const res = await commit(c.plan);
      written += res.written.length;
      skipped += res.skipped.length;
    }
    if (enumsChanged) {
      await writeFile(enumsPath, serializeEnumRegistry(mergedEnums), 'utf-8');
      written += 1;
    }
    clack.outro(
      pc.green(`Done — ${written} written, ${skipped} skipped (existing).`),
    );
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
