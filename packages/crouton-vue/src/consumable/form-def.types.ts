import type { JsonSchema, Layout } from '@jsonforms/core';

export type FormSchema = {
  data: JsonSchema;
  ui: Layout;
  defaultSort?: string;
  zodSchema: any;
  parseValue: (value: any) => any;
};

export type FormSchemas = {
  table: FormSchema;
  form: FormSchema;
  view?: FormSchema;
  filter?: FormSchema;
};

export type FormDefActionCondition = {
  field: string;
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists' | 'notExists';
  value?: unknown;
};

export type FormDefProcedureAction = {
  type?: 'procedure';
  id: string;
  label: string;
  uri: string;
  method?: string;
  data?: Record<string, unknown>;
  condition?: FormDefActionCondition;
};

export type FormDefLinkAction = {
  type: 'link';
  id: string;
  label: string;
  /** URL pattern, may contain `{id}` placeholder. */
  href: string;
  condition?: FormDefActionCondition;
};

export type FormDefAction = FormDefProcedureAction | FormDefLinkAction;

export type FormDef = {
  id: string;
  name: string;
  route: string;
  title: string;
  idField: string;
  idType: 'string' | 'number';
  modalSize?: 'xs' | 'sm' | 'lg' | 'xl';
  schemas: FormSchemas;
  operations: Record<string, boolean>;
  actions?: FormDefAction[];
};
