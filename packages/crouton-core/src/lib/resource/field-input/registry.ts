import { type z } from 'zod';

import { ArrayOptionsSchema } from './types/array.options';
import { AutocompleteOptionsSchema } from './types/autocomplete.options';
import { BooleanOptionsSchema } from './types/boolean.options';
import { CustomOptionsSchema } from './types/custom.options';
import { DateRangeOptionsSchema } from './types/date-range.options';
import { DateOptionsSchema } from './types/date.options';
import { MarkdownOptionsSchema } from './types/markdown.options';
import { NumberOptionsSchema } from './types/number.options';
import { RelationOptionsSchema } from './types/relation.options';
import { SelectOptionsSchema } from './types/select.options';
import { StringOptionsSchema } from './types/string.options';
import { TextareaOptionsSchema } from './types/textarea.options';
import { ToggleOptionsSchema } from './types/toggle.options';

export interface FieldInputTypeDef {
  options: z.ZodType;
  schemaFile: string;
}

export const fieldInputRegistry = new Map<string, FieldInputTypeDef>([
  ['string',      { options: StringOptionsSchema,        schemaFile: 'string' }],
  ['number',      { options: NumberOptionsSchema,        schemaFile: 'number' }],
  ['Integer',     { options: NumberOptionsSchema,        schemaFile: 'number' }],
  ['textarea',    { options: TextareaOptionsSchema,      schemaFile: 'textarea' }],
  ['markdown',    { options: MarkdownOptionsSchema,      schemaFile: 'markdown' }],
  ['boolean',     { options: BooleanOptionsSchema,       schemaFile: 'boolean' }],
  ['toggle',      { options: ToggleOptionsSchema,        schemaFile: 'toggle' }],
  ['select',      { options: SelectOptionsSchema,        schemaFile: 'select' }],
  ['mutliSelect', { options: SelectOptionsSchema,        schemaFile: 'select' }],
  ['autocomplete',{ options: AutocompleteOptionsSchema,  schemaFile: 'autocomplete' }],
  ['date',        { options: DateOptionsSchema,          schemaFile: 'date' }],
  ['dateTime',    { options: DateOptionsSchema,          schemaFile: 'date' }],
  ['date-range',  { options: DateRangeOptionsSchema,     schemaFile: 'date-range' }],
  ['relation',    { options: RelationOptionsSchema,      schemaFile: 'relation' }],
  ['array',       { options: ArrayOptionsSchema,         schemaFile: 'array' }],
  ['custom',      { options: CustomOptionsSchema,        schemaFile: 'custom' }],
]);

/** Register a custom control type's options schema. Call from app setup. */
export const registerFieldInputType = (type: string, def: FieldInputTypeDef): void => {
  fieldInputRegistry.set(type, def);
};
