import {
  type FieldInput,
  type JsonColumn,
  resolveTableField,
  resolveViewField,
} from '@ghentcdh/crouton-core';

import { type Resource } from '../resource/ResourceConfig.schema';

export type EditableFieldVariant = {
  resolved: FieldInput | undefined;
  hasOverride: boolean;
};

export type EditableColumn = {
  id: string;
  label?: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  form: FieldInput | undefined;
  view: EditableFieldVariant;
  table: EditableFieldVariant;
};

export const buildEditableColumnsPayload = (
  config: Resource,
): {
  id: string;
  route: string;
  columns: EditableColumn[];
} => {
  const columns = (config.columns as unknown as JsonColumn[] | undefined) ?? [];

  return {
    id: config.name,
    route: config.route,
    columns: columns.map((c) => ({
      id: c.id,
      label: c.label,
      column: c.column ?? c.id,
      hiddenInTable: c.hiddenInTable,
      hiddenInForm: c.hiddenInForm,
      hiddenInView: c.hiddenInView,
      form: c.fieldInput,
      view: { resolved: resolveViewField(c), hasOverride: c.fieldView != null },
      table: {
        resolved: resolveTableField(c),
        hasOverride: c.fieldTable != null,
      },
    })),
  };
};
