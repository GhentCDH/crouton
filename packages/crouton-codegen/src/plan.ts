/**
 * Orchestrator: tie `introspect` output to per-model `classify` + `diff`.
 *
 * Dependencies (existing-config reader, relation resolver, ruleset, database)
 * are injected so this composes cleanly and stays unit-testable without disk.
 */

import { type CroutonConfig } from '@ghentcdh/crouton-core';

import { classify, defaultRuleset } from './classify';
import { diff } from './diff';
import { resourceNames } from './naming';
import type { ExistingResource } from './project';
import type { DbModel, ResourceDiff, Ruleset } from './types';

export interface BuildDiffsDeps {
  /** Datasource name stamped on generated resources. */
  database?: string;
  ruleset?: Ruleset;
  resolveRelationResource?: (targetModel: string) => string | undefined;
  /** Read the on-disk resource (by directory/route name). */
  readExisting: (name: string) => Promise<ExistingResource>;
}

/** Merge a config's rule overrides over the defaults. */
export const resolveRuleset = (
  config?: Pick<CroutonConfig, 'rules'>,
): Ruleset => ({
  ...defaultRuleset(),
  ...(config?.rules ?? {}),
});

/** Build the `ResourceDiff` for a single model. */
export const buildResourceDiff = async (
  model: DbModel,
  deps: BuildDiffsDeps,
): Promise<ResourceDiff> => {
  const draft = classify(model, {
    database: deps.database,
    ruleset: deps.ruleset,
    resolveRelationResource: deps.resolveRelationResource,
  });
  const { name } = resourceNames(model.prismaName);
  const { config, hasSchemaFile } = await deps.readExisting(name);
  return diff({ draft, existing: config, hasSchemaFile });
};

/** Build diffs for many models (sequentially; introspection is already done). */
export const buildResourceDiffs = async (
  models: DbModel[],
  deps: BuildDiffsDeps,
): Promise<ResourceDiff[]> => {
  const diffs: ResourceDiff[] = [];
  for (const model of models) diffs.push(await buildResourceDiff(model, deps));
  return diffs;
};
