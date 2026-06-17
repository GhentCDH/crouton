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
  type ResolvedDatasource,
  type ResolvedDiff,
  type WritePlan,
  apply,
  buildEnumRegistry,
  buildResourceDiffs,
  commit,
  introspect,
  loadConfig,
  loadDatasources,
  makeRelationResolver,
  makeSchemaExportName,
  mergeEnumRegistry,
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

import { formatResourceChange } from './preview';
import { backupSchema, isGitDirty, prismaDbPull, prismaGenerate } from './prisma';
import { CancelledError, interactiveResolver } from './resolver';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve as pathResolve } from 'node:path';

export interface UpdateResourcesOptions {
  cwd?: string;
  datasource?: string;
  models?: string;
  dryRun?: boolean;
  yes?: boolean;
  skipPull?: boolean;
  skipGenerate?: boolean;
}

const assertNotCancel = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) throw new CancelledError();
  return value as T;
};

const loadOrScaffoldConfig = async (cwd: string, yes: boolean): Promise<LoadedConfig> => {
  try {
    return await loadConfig(cwd);
  } catch {
    clack.log.warn('No crouton.json found.');
    const { config, datasources, notes } = await scaffoldConfigFromProject(cwd);
    for (const n of notes) clack.log.info(n);
    clack.log.message(pc.dim(JSON.stringify(config, null, 2)));
    const write = yes
      ? true
      : assertNotCancel(await clack.confirm({ message: 'Write this crouton.json (+ data-source.json files)?', initialValue: true }));
    if (!write) throw new CancelledError();

    const path = join(cwd, 'crouton.json');
    await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
    // Write a self-describing data-source.json per discovered/proposed datasource.
    for (const { folder, ...ds } of datasources) {
      const dsPath = join(cwd, config.dataSourcesDir, folder, 'data-source.json');
      await mkdir(dirname(dsPath), { recursive: true });
      await writeFile(dsPath, `${JSON.stringify(ds, null, 2)}\n`, 'utf-8');
    }
    clack.log.success(`Wrote ${path} + ${datasources.length} data-source.json`);
    return { config, path, root: cwd };
  }
};

const pickDatasource = async (
  datasources: ResolvedDatasource[],
  requested: string | undefined,
  yes: boolean,
): Promise<ResolvedDatasource> => {
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
    const wanted = new Set(filter.split(',').map((s) => s.trim()).filter(Boolean));
    return models.filter(
      (m) => wanted.has(m.prismaName) || wanted.has(resourceNames(m.prismaName).name),
    );
  }
  if (yes) return models;
  const existing = new Set(
    (await Promise.all(models.map((m) => readExistingResource(loaded, resourceNames(m.prismaName).name)))).flatMap(
      (r, i) => (r.config ? [models[i].prismaName] : []),
    ),
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

export const runUpdateResources = async (opts: UpdateResourcesOptions): Promise<void> => {
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
      await backupSchema(schemaAbs);
      const spin = clack.spinner();
      spin.start(`prisma db pull (${ds.name})`);
      const pull = await prismaDbPull(loaded.root, configAbs);
      spin.stop(pull.ok ? 'Schema pulled' : 'db pull failed');
      if (!pull.ok) {
        clack.log.error(pull.output);
        throw new CancelledError();
      }
    }

    // Always refresh generated types (independent of pull) unless skipped.
    if (!opts.skipGenerate) {
      const spin = clack.spinner();
      spin.start('prisma generate');
      const gen = await prismaGenerate(loaded.root, configAbs);
      spin.stop(gen.ok ? 'Types generated' : 'generate failed (continuing)');
      if (!gen.ok) clack.log.warn(gen.output);
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
      existingEnums = JSON.parse(await readFile(enumsPath, 'utf-8')) as EnumRegistry;
    } catch {
      /* no registry yet */
    }
    const mergedEnums = mergeEnumRegistry(existingEnums, buildEnumRegistry(models));
    const enumsChanged =
      serializeEnumRegistry(mergedEnums) !== serializeEnumRegistry(existingEnums);

    const resolveRelationResource = await makeRelationResolver(loaded);
    const diffs = await buildResourceDiffs(models, {
      database: ds.name,
      ruleset: resolveRuleset(loaded.config),
      resolveRelationResource,
      readExisting: (name) => readExistingResource(loaded, name),
    });

    const applyCtx: ApplyContext = {
      resourcesDir: resolveFromRoot(loaded.root, loaded.config.resourcesDir),
      generatedTypesImport: ds.generatedTypesImport,
      schemaExportName: makeSchemaExportName(loaded.config),
    };
    const resolver = opts.yes ? recommendedResolver : interactiveResolver;

    const all: { resolved: ResolvedDiff; plan: WritePlan }[] = [];
    for (const diff of diffs) {
      const resolved = await resolveDiff(diff, resolver);
      all.push({ resolved, plan: apply(resolved, applyCtx) });
    }
    // Only surface resources that actually changed — adjusted files only.
    const changes = all.filter((c) => c.plan.files.length > 0 || c.plan.notes.length > 0);

    if (changes.length === 0 && !enumsChanged) {
      clack.outro(pc.green('Everything is up to date — nothing to write.'));
      return;
    }

    const previewLines = changes.map((c) => formatResourceChange(c));
    if (enumsChanged) {
      previewLines.push(pc.cyan(`~ ${enumsRel} (${Object.keys(mergedEnums).length} enum(s))`));
    }
    clack.log.message(previewLines.join('\n'));

    if (opts.dryRun) {
      clack.outro(pc.yellow('Dry run — no files written.'));
      return;
    }

    const fileCount =
      changes.reduce((n, c) => n + c.plan.files.length, 0) + (enumsChanged ? 1 : 0);
    const go = opts.yes
      ? true
      : assertNotCancel(await clack.confirm({ message: `Write ${fileCount} file(s)?`, initialValue: true }));
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
    clack.outro(pc.green(`Done — ${written} written, ${skipped} skipped (existing).`));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
