import { BaseOptionsSchema } from '../base.options';

export const ColorOptionsSchema = BaseOptionsSchema.extend({}).meta({
  title: 'Color options',
  description: 'Hex color (`#rrggbb`) picked with the native color input. All common options apply.',
});
