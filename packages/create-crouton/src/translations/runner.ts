/**
 * `crouton translations init` / `crouton translations update` runner.
 *
 * Reads all resource.json files + the enum registry, builds per-language
 * translation bundles, merges with existing files (hand edits preserved),
 * and writes the result to `<translationsDir>/<lang>.json`.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import {
  type EnumRegistry,
  type TranslationBundle,
  buildTranslationBundle,
  findStaleKeys,
  loadConfig,
  mergeTranslationBundle,
  readAllResourceJsons,
  resolveFromRoot,
  serializeTranslationBundle,
} from '@ghentcdh/crouton-codegen';
import type { I18nConfig } from '@ghentcdh/crouton-core';

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve as pathResolve  } from 'node:path';

export interface TranslationsOptions {
  cwd?: string;
  lang?: string;
  prune?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

/** Read existing translation bundle from disk, or return empty. */
const readExistingBundle = async (
  path: string,
): Promise<TranslationBundle> => {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as TranslationBundle;
  } catch {
    return {};
  }
};

/** Read the enum registry from disk, or return empty. */
const readEnumRegistry = async (path: string): Promise<EnumRegistry> => {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as EnumRegistry;
  } catch {
    return {};
  }
};

export interface TranslationWritePlan {
  lang: string;
  path: string;
  content: string;
  newKeys: number;
  staleKeys: string[];
  isNew: boolean;
}

/**
 * Compute translation write plans for the configured languages.
 * Pure planning — no I/O beyond reading existing files.
 */
export const planTranslationWrites = async (opts: {
  root: string;
  i18n: I18nConfig;
  enumsFile: string;
  languages?: string[];
}): Promise<TranslationWritePlan[]> => {
  const { root, i18n } = opts;
  const translationsDir = resolveFromRoot(root, i18n.translationsDir);
  const enumsPath = resolveFromRoot(root, opts.enumsFile);

  const config = await loadConfig(root);
  const resources = await readAllResourceJsons(config);
  const enums = await readEnumRegistry(enumsPath);

  const generated = buildTranslationBundle(resources, enums);
  const langs = opts.languages ?? i18n.languages;

  const plans: TranslationWritePlan[] = [];
  for (const lang of langs) {
    const filePath = join(translationsDir, `${lang}.json`);
    const existing = await readExistingBundle(filePath);
    const isNew = !existsSync(filePath);

    // For non-default languages, seed new keys empty so untranslated keys
    // are visible in diffs and fall back cleanly.
    let genForLang = generated;
    if (lang !== i18n.defaultLanguage) {
      genForLang = emptyValues(generated);
    }

    const merged = isNew ? genForLang : mergeTranslationBundle(existing, genForLang);
    const staleKeys = isNew ? [] : findStaleKeys(existing, generated);
    const content = serializeTranslationBundle(merged);

    // Count new keys vs existing
    const existingKeys = isNew ? 0 : countLeafKeys(existing);
    const mergedKeys = countLeafKeys(merged);
    const newKeys = mergedKeys - existingKeys;

    plans.push({ lang, path: filePath, content, newKeys, staleKeys, isNew });
  }

  return plans;
};

/** Replace all leaf string values with empty strings. */
const emptyValues = (obj: unknown): TranslationBundle => {
  if (typeof obj === 'string') return '' as unknown as TranslationBundle;
  if (obj == null || typeof obj !== 'object') return obj as TranslationBundle;
  if (Array.isArray(obj)) return obj.map(emptyValues) as unknown as TranslationBundle;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = emptyValues(v);
  }
  return out as unknown as TranslationBundle;
};

/** Count leaf string keys in a nested object. */
const countLeafKeys = (obj: unknown): number => {
  if (typeof obj === 'string') return 1;
  if (obj == null || typeof obj !== 'object') return 0;
  let count = 0;
  for (const v of Object.values(obj)) {
    count += countLeafKeys(v);
  }
  return count;
};

export const runTranslationsInit = async (
  opts: TranslationsOptions,
): Promise<void> => {
  const cwd = pathResolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('crouton translations init'));

  try {
    const config = await loadConfig(cwd);
    const i18n = config.config.i18n;
    if (!i18n) {
      clack.outro(
        pc.yellow('No "i18n" block in crouton.json — nothing to do.'),
      );
      return;
    }

    const langs = opts.lang
      ? opts.lang.split(',').map((s) => s.trim())
      : undefined;

    const plans = await planTranslationWrites({
      root: config.root,
      i18n,
      enumsFile: config.config.enumsFile ?? 'crouton.enums.json',
      languages: langs,
    });

    if (plans.length === 0) {
      clack.outro(pc.yellow('No languages configured.'));
      return;
    }

    // Ensure translations directory exists
    const translationsDir = resolveFromRoot(
      config.root,
      i18n.translationsDir,
    );
    await mkdir(translationsDir, { recursive: true });

    // Preview
    for (const plan of plans) {
      const status = plan.isNew ? pc.green('+ create') : pc.cyan('~ update');
      const info = plan.newKeys > 0 ? ` (${plan.newKeys} new key(s))` : '';
      clack.log.info(`${status} ${plan.lang}.json${info}`);
    }

    if (opts.dryRun) {
      clack.outro(pc.yellow('Dry run — no files written.'));
      return;
    }

    if (!opts.yes) {
      const go = await clack.confirm({
        message: `Write ${plans.length} translation file(s)?`,
        initialValue: true,
      });
      if (clack.isCancel(go) || !go) {
        clack.cancel('Cancelled.');
        return;
      }
    }

    for (const plan of plans) {
      await writeFile(plan.path, plan.content, 'utf-8');
    }
    clack.outro(pc.green(`Done — ${plans.length} file(s) written.`));
  } catch (err) {
    if (err instanceof Error) {
      clack.log.error(err.message);
    }
    throw err;
  }
};

export const runTranslationsUpdate = async (
  opts: TranslationsOptions,
): Promise<void> => {
  const cwd = pathResolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('crouton translations update'));

  try {
    const config = await loadConfig(cwd);
    const i18n = config.config.i18n;
    if (!i18n) {
      clack.outro(
        pc.yellow('No "i18n" block in crouton.json — nothing to do.'),
      );
      return;
    }

    const langs = opts.lang
      ? opts.lang.split(',').map((s) => s.trim())
      : undefined;

    const plans = await planTranslationWrites({
      root: config.root,
      i18n,
      enumsFile: config.config.enumsFile ?? 'crouton.enums.json',
      languages: langs,
    });

    if (plans.length === 0) {
      clack.outro(pc.yellow('No languages configured.'));
      return;
    }

    // Ensure translations directory exists
    const translationsDir = resolveFromRoot(
      config.root,
      i18n.translationsDir,
    );
    await mkdir(translationsDir, { recursive: true });

    // Preview
    const previewLines: string[] = [];
    let hasChanges = false;
    for (const plan of plans) {
      const status = plan.isNew ? pc.green('+ create') : pc.cyan('~ update');
      const info = plan.newKeys > 0 ? ` (${plan.newKeys} new key(s))` : '';
      previewLines.push(`${status} ${plan.lang}.json${info}`);
      if (plan.newKeys > 0 || plan.isNew) hasChanges = true;

      if (plan.staleKeys.length > 0 && !opts.prune) {
        previewLines.push(
          pc.yellow(
            `    ${plan.staleKeys.length} stale key(s) (use --prune to remove)`,
          ),
        );
      }
      if (plan.staleKeys.length > 0 && opts.prune) {
        previewLines.push(
          pc.red(`    pruning ${plan.staleKeys.length} stale key(s)`),
        );
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      clack.outro(pc.green('Translations are up to date — nothing to write.'));
      return;
    }

    clack.log.message(previewLines.join('\n'));

    if (opts.dryRun) {
      clack.outro(pc.yellow('Dry run — no files written.'));
      return;
    }

    if (!opts.yes) {
      const go = await clack.confirm({
        message: `Write ${plans.length} translation file(s)?`,
        initialValue: true,
      });
      if (clack.isCancel(go) || !go) {
        clack.cancel('Cancelled.');
        return;
      }
    }

    for (const plan of plans) {
      await writeFile(plan.path, plan.content, 'utf-8');
    }
    clack.outro(pc.green(`Done — ${plans.length} file(s) written.`));
  } catch (err) {
    if (err instanceof Error) {
      clack.log.error(err.message);
    }
    throw err;
  }
};
