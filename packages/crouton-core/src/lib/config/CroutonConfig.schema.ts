import { z } from 'zod';

import { JsonOperationsSchema } from '../data-source/Operations.schema';
import { SidebarGroupSchema } from '../resource';

export const RulesetSchema = z.object({
  hideIdInTable: z.boolean().default(true).describe('When true (default), the id column is hidden in the table view.'),
  hideIdInForm: z.boolean().default(true).describe('When true (default), the id column is hidden in the create/edit form.'),
  hideIdInView: z.boolean().default(true).describe('When true (default), the id column is hidden in the detail view.'),
  hideTimestamps: z.boolean().default(true).describe('When true (default), createdAt/updatedAt columns are hidden from all views.'),
  hideForeignKeys: z.boolean().default(true).describe('When true (default), foreign key columns (e.g. authorId) are hidden — the relation column shows instead.'),
  includeRelations: z.boolean().default(true).describe('When true (default), relations are auto-included in Prisma queries.'),
  hideRelationsInTable: z.boolean().default(true).describe('When true (default), relation columns are hidden in the table view.'),
  showRelationsInForm: z.boolean().default(true).describe('When true (default), relation columns are shown in the create/edit form.'),
  enumValueLabel: z.boolean().default(true).describe('When true (default), enum values are displayed as their label rather than their raw value.'),
  sharedEnums: z.boolean().default(true).describe('When true (default), shared enums from crouton.enums.json are merged into resource columns automatically.'),
  defaultOperations: JsonOperationsSchema.default(
    JsonOperationsSchema.parse({}),
  ).describe('Default CRUD operations enabled for all resources. Individual resources can override via their operations block.'),
});

export type Ruleset = z.infer<typeof RulesetSchema>;

export const I18nConfigSchema = z.object({
  defaultLanguage: z.string().default('en').describe('Default / fallback language code (e.g. "en").'),
  languages: z.array(z.string()).min(1).describe('All supported language codes. At least one is required.'),
  translationsDir: z.string().default('translations').describe('Directory containing <lang>.json bundles, relative to the project root.'),
});

export type I18nConfig = z.infer<typeof I18nConfigSchema>;

export const CroutonConfigSchema = z.object({
  $schema: z.string().optional().describe('URL of the generated JSON Schema for editor autocomplete and validation. Ignored at runtime.'),
  title: z.string().describe('Application title served to the frontend via GET /_app/layout. Displayed in the admin sidebar header.'),
  resourcesDir: z.string().describe('Path to resource directories, relative to the project root. Each sub-directory contains a resource.json.'),
  dataSourcesDir: z.string().describe('Path to datasource folders, relative to the project root. Each sub-directory contains a data-source.json.'),
  schemaExportName: z.string().default('{Model}WithRelationsSchema').describe('Template for a Prisma model\'s Zod export name. {Model} is replaced by the Prisma model name. Default matches the zod-prisma-types "createRelationValuesTypes" output.'),
  enumsFile: z.string().default('crouton.enums.json').describe('Path to the shared enum registry, relative to the project root. Defaults to "crouton.enums.json".'),
  rules: RulesetSchema.default(RulesetSchema.parse({})).describe('Optional overrides of the default visibility and behaviour ruleset applied to all resources.'),
  sidebarGroups: z.record(z.string(), SidebarGroupSchema).default({}).describe('Sidebar group definitions, keyed by group slug (e.g. "metadata"). Resources reference a group via sidebar.group in their resource.json.'),
  autoSave: z.boolean().default(true).describe('Whether form fields are saved automatically as the user edits them. Default true.'),
  i18n: I18nConfigSchema.optional().describe('Optional i18n / translation configuration. Omit if the app is single-language.'),
});

export type CroutonConfig = z.infer<typeof CroutonConfigSchema>;
