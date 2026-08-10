import type { JsonSchema, Layout } from '@jsonforms/core';

import { LayoutBuilder } from './layout/layout.builder';

export const uiFromJsonSchema = (jsonSchema: JsonSchema): Layout => {
  const properties = jsonSchema.properties ?? {};
  const layout = LayoutBuilder.grid();
  for (const key of Object.keys(properties)) {
    layout.addControl(key);
  }
  return layout.build();
};
