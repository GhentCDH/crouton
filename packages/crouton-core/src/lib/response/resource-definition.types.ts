import type { JsonSchema, Layout } from '@jsonforms/core';
import type { ZodType } from 'zod';

import { type ResourceDefinitionResponse } from './resource-definition.schema';
import { type LayoutNode } from '../resource';

export type ResourceViewSchema = {
  data: JsonSchema;
  ui: Layout;
  defaultSort?: string;
  zodSchema: ZodType;
  parseValue: (value: any) => any;
};

export type ResourceViewSchemas = {
  table: ResourceViewSchema;
  form: ResourceViewSchema;
  view?: ResourceViewSchema;
  filter?: ResourceViewSchema;
};

export type ResourceActionCondition = {
  field: string;
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists' | 'notExists';
  value?: unknown;
};

export type ResourceProcedureAction = {
  type?: 'procedure';
  id: string;
  label: string;
  uri: string;
  method?: string;
  data?: Record<string, unknown>;
  condition?: ResourceActionCondition;
};

export type FormDefLinkAction = {
  type: 'link';
  id: string;
  label: string;
  /** URL pattern, may contain `{id}` placeholder. */
  href: string;
  condition?: ResourceActionCondition;
};

export type ResourceAction = ResourceProcedureAction | FormDefLinkAction;

/** Table-level procedure action — no record id, shown as a toolbar button. */
export type FormDefTableProcedureAction = {
  type?: 'procedure';
  id: string;
  label?: string;
  icon?: string;
  tooltip?: string;
  uri: string;
  method?: string;
  data?: Record<string, unknown>;
};

export type ResourceTableLinkAction = {
  type: 'link';
  id: string;
  label?: string;
  icon?: string;
  tooltip?: string;
  href: string;
};

export type FormDefTableAction =
  FormDefTableProcedureAction | ResourceTableLinkAction;

/**
 * Parsed resource definition: the raw {@link ResourceDefinitionResponse} with every view
 * schema enriched with a compiled `zodSchema` and `parseValue` helper.
 * Derived from the response type so the two can never drift apart.
 */
export type ResourceDefinition = Omit<ResourceDefinitionResponse, 'schemas'> & {
  schemas: ResourceViewSchemas;
  tableLayout?: LayoutNode;
};
