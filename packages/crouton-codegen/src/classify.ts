/**
 * classify: a `DbModel` + `Ruleset` → a fully generated `ResourceDraft`.
 *
 * Encodes the default visibility rules (decided with the user):
 *  - primary key: hidden in table/form/view, marked `idField`
 *  - created/updated timestamps: hidden in table+form, non-editable
 *  - foreign-key scalars: hidden in table+form, non-editable
 *  - relations: hidden in table always; shown in form/view only when the
 *    target resource exists, otherwise hidden everywhere
 */

import { type JsonColumnInput, type ResourceJsonInput, type Ruleset, RulesetSchema } from '@ghentcdh/crouton-core';

import type { DbModel } from './db-model';
import type { ResourceDraft } from './draft';
import { resourceNames, scalarFieldInputType } from './naming';

export const defaultRuleset = (): Ruleset => RulesetSchema.parse({});

export interface ClassifyContext {
  /** Datasource name stamped on `database`. */
  database?: string;
  ruleset?: Ruleset;
  /**
   * Resolve the relative `resource` path for a relation's target model, or
   * `undefined` if no such resource exists (relation left hidden + unwired).
   */
  resolveRelationResource?: (targetModel: string) => string | undefined;
}

type Column = Partial<Omit<JsonColumnInput, 'id'>>;

export const classify = (
  model: DbModel,
  ctx: ClassifyContext = {},
): ResourceDraft => {
  const ruleset = ctx.ruleset ?? defaultRuleset();
  const names = resourceNames(model.prismaName);
  const columnOrder: string[] = [];
  const columns: Record<string, Column> = {};
  const unwiredRelations: { field: string; targetModel: string }[] = [];
  let position = 0;

  for (const field of model.fields) {
    // Relations are ignored by default — they are not real DB columns and can't
    // be ordered/filtered like scalars (a relation column in `orderBy` is a
    // Prisma validation error). Skip them entirely unless explicitly enabled.
    if (field.kind === 'relation' && !ruleset.includeRelations) continue;

    let col: Column;

    if (field.kind === 'id') {
      col = {
        idField: true,
        hiddenInTable: ruleset.hideIdInTable,
        hiddenInForm: ruleset.hideIdInForm,
        hiddenInView: ruleset.hideIdInView,
      };
    } else if (field.isTimestamp) {
      col = ruleset.hideTimestamps
        ? {
            hiddenInTable: true,
            hiddenInForm: true,
            createable: false,
            updateable: false,
          }
        : { fieldInput: { type: 'date', position: position++ } };
    } else if (field.kind === 'foreignKey') {
      col = ruleset.hideForeignKeys
        ? {
            hiddenInTable: true,
            hiddenInForm: true,
            createable: false,
            updateable: false,
          }
        : { fieldInput: { type: 'text', position: position++ } };
    } else if (field.kind === 'relation') {
      const target = ctx.resolveRelationResource?.(field.relationModel ?? '');
      if (ruleset.showRelationsInForm && target) {
        col = {
          hiddenInTable: ruleset.hideRelationsInTable,
          fieldInput: {
            type: 'relation',
            format: 'relation',
            resource: target,
            relationType: field.relationType,
          },
        };
      } else {
        col = { hiddenInTable: true, hiddenInForm: true, hiddenInView: true };
        unwiredRelations.push({
          field: field.name,
          targetModel: field.relationModel ?? '',
        });
      }
    } else if (field.kind === 'enum') {
      const options: Record<string, unknown> = {};
      if (ruleset.enumValueLabel) options.emitObject = true;
      if (!ruleset.sharedEnums) {
        options.values = (field.enumValues ?? []).map((v) => ({
          label: v,
          value: v,
        }));
      }
      col = {
        ...(ruleset.enumValueLabel ? { displayKey: 'label' } : {}),
        ...(ruleset.sharedEnums ? { enum: field.type } : {}),
        fieldInput: { type: 'select', position: position++, options },
      };
    } else {
      col = {
        fieldInput: {
          type: scalarFieldInputType(field.name, field.type),
          position: position++,
        },
      };
    }

    columns[field.name] = col;
    columnOrder.push(field.name);
  }

  const config: ResourceJsonInput = {
    name: names.name,
    route: names.route,
    model: names.model,
    tag: names.tag,
    title: names.title,
    ...(model.idType ? { idType: model.idType } : {}),
    ...(ctx.database ? { database: ctx.database } : {}),
    sidebar: { hide: false },
    operations: ruleset.defaultOperations,
    columns,
  };

  const hasRelations = model.fields.some((f) => f.kind === 'relation');
  return {
    name: names.name,
    prismaName: model.prismaName,
    config,
    hasRelations,
    columnOrder,
    unwiredRelations,
  };
};
