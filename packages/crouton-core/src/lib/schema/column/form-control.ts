import type { Layout } from '@jsonforms/core';

import { isArrayColumn, isObjectColumn } from './predicates';
import { ControlBuilder } from '../../layout/control.builder';
import type { MarkdownOptions } from '../../layout/control.builder';
import { LayoutBuilder } from '../../layout/layout.builder';
import type { WhenCondition } from '../../layout/schema/LayoutControl.schema';
import { type JsonColumn, normalizeUnique } from '../../resource/Column';
import { columnTypeName, columnTypeToJsonSchema } from '../../resource/ColumnType.schema';
import type { DetailConfig } from '../../resource/FieldInput.schema';

export type { WhenCondition };

/** Convert a `WhenCondition` to the JSON Schema fragment used inside a JSON Forms rule. */
export const buildConditionSchema = (
  when: WhenCondition,
): Record<string, unknown> => {
  if (when.notExists) return { not: { minLength: 1 } };
  if (when.exists) return { minLength: 1 };
  if (when.neq !== undefined) return { not: { const: when.neq } };
  return { const: when.eq };
};

/** @deprecated Use layout controls' showWhen/hideWhen/disabledWhen instead. */
// ── Form control builders ─────────────────────────────────────────────────

const buildDetailLayout = (detail: DetailConfig) => {
  const inner =
    detail.layout === 'collapse'
      ? LayoutBuilder.collapse()
      : LayoutBuilder.horizontal();

  inner.addControls(
    ...detail.controls.map((dc) => {
      const ctrl = ControlBuilder.propertiesStr(dc.property);
      if (dc.type === 'markdown') {
        ctrl.markdown(dc.options as Partial<Omit<MarkdownOptions, 'format'>>);
      } else if (dc.type) {
        ctrl.control(dc.type, dc.options ?? {});
      }
      if (dc.hideLabel) ctrl.hideLabel();
      if (dc.width) ctrl.width(dc.width);
      return ctrl;
    }),
  );

  if (detail.titleKey) inner.titleKey(detail.titleKey);
  return inner;
};

/**
 * Renderer format for a column with no explicit `fieldInput.type`, derived from
 * its declared `type`. Scalars keep the historical `text` default.
 */
const defaultControlFormat = (col: JsonColumn): string => {
  if (isObjectColumn(col)) return 'object';
  if (isArrayColumn(col)) return 'array';
  const typeName = columnTypeName(col.type);
  if (typeName === 'number' || typeName === 'integer') return typeName;
  const format = columnTypeToJsonSchema(col.type).format;
  if (format === 'date') return 'date';
  if (format === 'date-time') return 'dateTime';
  return 'text';
};

export const buildFormControl = (col: JsonColumn): ControlBuilder<Record<string, unknown>> => {
  const control = ControlBuilder.propertiesStr(col.id);
  const fieldInput = col.fieldInput;

  if (col.relation !== undefined || fieldInput?.format === 'relation') {
    const options: Record<string, unknown> = { ...(fieldInput?.options as object | undefined) };
    if (!options['colspan']) options['colspan'] = 12;
    const relationType = col.relation?.type ?? fieldInput?.relationType;
    if (relationType) options['relationType'] = relationType;
    control.control('relation', options).width('full');
  } else if (fieldInput?.type === 'autocomplete') {
    const options: Record<string, unknown> = { ...(fieldInput.options as object | undefined) };
    if (!options['colspan']) options['colspan'] = 12;
    if (fieldInput.relationType) options['relationType'] = fieldInput.relationType;
    // Use explicit format when set; otherwise the type itself is the format.
    const format = fieldInput.format ?? fieldInput.type;
    control.control(format, options).width('full');
  } else if (fieldInput?.detail) {
    const detailLayout = buildDetailLayout(fieldInput.detail);
    control.detailFixed(detailLayout, {
      layout: fieldInput.detail.layout === 'collapse' ? 'row' : undefined,
    });
  } else if (
    fieldInput?.format !== 'date-range' &&
    (fieldInput?.type === 'date' || fieldInput?.format === 'dateTime')
  ) {
    // Explicit branch (like date-range below) so the datepicker's date options
    // — withTime / min / max / locale — survive into the uischema. Without it
    // these fall through the generic else and are silently dropped.
    const options: Record<string, unknown> = { ...(fieldInput.options as object | undefined) };
    if (!options['colspan']) options['colspan'] = 12;
    const format = fieldInput.format === 'dateTime' ? 'dateTime' : 'date';
    control.control(format, options).width('full');
  } else if (fieldInput?.format === 'date-range') {
    // Drive the renderer off the explicit `format` so its option-based tester
    // matches, not `type` (which for this json column is 'object' and has no
    // renderer). Mirrors the relation branch.
    const options: Record<string, unknown> = { ...(fieldInput.options as object | undefined) };
    if (!options['colspan']) options['colspan'] = 12;
    control.control('date-range', options).width('full');
  } else {
    const options: Record<string, unknown> = { ...(fieldInput?.options as object | undefined) };
    if (!options['colspan']) options['colspan'] = 12;
    // Drive the renderer off the column's declared shape when no widget is
    // named. Without this an object/array column falls through to `text`, whose
    // tester requires a string schema, and no renderer matches at all.
    const type = fieldInput?.type ?? defaultControlFormat(col);
    // ponytail: options not in branches above are dropped; add a branch if your type needs custom option forwarding
    control.control(type, options).width('full');
  }

  // Carry declared uniqueness into the control options so the renderer can
  // attach an async 'is this value already taken?' validator.
  if (col.unique) control.opt({ unique: normalizeUnique(col.unique) });
  if (fieldInput?.customRender)
    control.setCustomRender(fieldInput?.customRender);
  if (col.hideLabel) control.hideLabel();
  if (col.label) control.label(col.label);

  return control;
};

/** Build the GridLayout UI schema for a form view. */
export const buildFormUiSchema = (cols: JsonColumn[]): Layout => {
  const layout = LayoutBuilder.grid();
  for (const col of cols) layout.addControl(buildFormControl(col));
  return layout.build();
};
