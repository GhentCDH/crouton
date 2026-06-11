import type { JsonSchema } from '@jsonforms/core';
import { ControlBuilder } from './layout/control.builder';
import type { LayoutType } from './layout/layout.builder';
import { LayoutBuilder } from './layout/layout.builder';

export const uiFromJsonSchema = (jsonSchema: JsonSchema): LayoutType => {
  const properties = jsonSchema.properties ?? {};
  const layout = LayoutBuilder.grid<Record<string, unknown>>();
  for (const key of Object.keys(properties)) {
    layout.addControl(ControlBuilder.properties<Record<string, unknown>>(key));
  }
  return layout.build();
};
