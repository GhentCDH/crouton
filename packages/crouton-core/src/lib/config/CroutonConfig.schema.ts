import { z } from 'zod';

import { JsonOperationsSchema } from '../data-source/Operations.schema';
import { SidebarGroupSchema } from '../resource';

export const RulesetSchema = z.object({
  hideIdInTable: z.boolean().default(true),
  hideIdInForm: z.boolean().default(true),
  hideIdInView: z.boolean().default(true),
  hideTimestamps: z.boolean().default(true),
  hideForeignKeys: z.boolean().default(true),
  includeRelations: z.boolean().default(false),
  hideRelationsInTable: z.boolean().default(true),
  showRelationsInForm: z.boolean().default(true),
  enumValueLabel: z.boolean().default(true),
  sharedEnums: z.boolean().default(true),
  defaultOperations: JsonOperationsSchema.default(JsonOperationsSchema.parse({})),
});

export type Ruleset = z.infer<typeof RulesetSchema>;

export const CroutonConfigSchema = z.object({
  /**
   * Application title served to the frontend via `GET /_app/layout`.
   * Displayed in the admin sidebar header.
   */
  title: z.string(),
  /** Where resource directories live, relative to the project root. */
  resourcesDir: z.string(),
  /** Where datasource folders live (each with a `data-source.json`). */
  dataSourcesDir: z.string(),
  /**
   * Template for a model's Zod export name. `{Model}` → Prisma model name.
   * Defaults to `{Model}WithRelationsSchema` (the relations-aware schema
   * emitted by zod-prisma-types when `createRelationValuesTypes` is on).
   */
  schemaExportName: z.string().default('{Model}WithRelationsSchema'),
  /** Path to the shared enum registry, relative to project root. Default `crouton.enums.json`. */
  enumsFile: z.string().default('croutons.enums.json'),
  /** Optional overrides of the default visibility ruleset. */
  rules: RulesetSchema.default(RulesetSchema.parse({})),
  /**
   * Sidebar group definitions, keyed by group slug (e.g. `"metadata"`).
   * Resources reference a group via `sidebar.group` in their `resource.json`.
   */
  sidebarGroups: z.record(z.string(), SidebarGroupSchema).default({}),
  /**
   * Whether form fields are saved automatically as the user edits them.
   * @default true
   */
  autoSave: z.boolean().default(true),
});

export type CroutonConfig = z.infer<typeof CroutonConfigSchema>;
