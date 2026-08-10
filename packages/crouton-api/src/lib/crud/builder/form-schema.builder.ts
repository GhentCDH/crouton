import { ControlBuilder, LayoutBuilder } from '@ghentcdh/crouton-core';
import type { DetailConfig, JsonColumn } from '@ghentcdh/crouton-core';

// ── Condition / rule builders ─────────────────────────────────────────────

/** Condition descriptor used to build JSON Forms rules (`showWhen`, `hideWhen`, `disabledWhen`). */
export type WhenCondition = {
  field: string;
  eq?: unknown;
  neq?: unknown;
  exists?: boolean;
  notExists?: boolean;
};

/** Convert a `WhenCondition` to the JSON Schema fragment used inside a JSON Forms rule. */
export const buildConditionSchema = (
  when: WhenCondition,
): Record<string, unknown> => {
  if (when.notExists) return { not: { minLength: 1 } };
  if (when.exists) return { minLength: 1 };
  if (when.neq !== undefined) return { not: { const: when.neq } };
  return { const: when.eq };
};

/**
 * Build a JSON Forms rule object for a column's visibility/disabled condition.
 * Returns `undefined` when the column has no conditional rules.
 *
 * Kept for backwards compatibility (re-exported from `crud/builder`). The form builder
 * now applies rules through `ControlBuilder.showWhen/hideWhen/disableWhen` instead —
 * see `applyColumnRule`.
 */
export const buildRule = (
  col: JsonColumn,
): Record<string, unknown> | undefined => {
  if (col.disabledWhen) {
    return {
      effect: 'DISABLE',
      condition: {
        scope: `#/properties/${col.disabledWhen.field}`,
        schema: buildConditionSchema(col.disabledWhen),
      },
    };
  }
  const when = col.showWhen ?? col.hideWhen;
  if (!when) return undefined;
  const effect = col.showWhen ? 'SHOW' : 'HIDE';
  return {
    effect,
    condition: {
      scope: `#/properties/${when.field}`,
      schema: buildConditionSchema(when),
    },
  };
};

/** Apply a column's conditional rule to a control builder, in the builder chain. */
const applyColumnRule = (control: ControlBuilder<any>, col: JsonColumn): void => {
  if (col.disabledWhen) {
    control.disableWhen(
      `#/properties/${col.disabledWhen.field}`,
      buildConditionSchema(col.disabledWhen),
    );
    return;
  }
  const when = col.showWhen ?? col.hideWhen;
  if (!when) return;
  const scope = `#/properties/${when.field}`;
  const schema = buildConditionSchema(when);
  if (col.showWhen) control.showWhen(scope, schema);
  else control.hideWhen(scope, schema);
};

// ── Form control builders ─────────────────────────────────────────────────

const buildDetailLayout = (detail: DetailConfig) => {
  const inner =
    detail.layout === 'collapse'
      ? LayoutBuilder.collapse<any>()
      : LayoutBuilder.horizontal<any>();

  inner.addControls(
    ...detail.controls.map((dc) => {
      const ctrl = ControlBuilder.properties<any>(dc.property as keyof any);
      if (dc.type === 'markdown') {
        ctrl.markdown(dc.options as any);
      } else if (dc.type) {
        ctrl.control(dc.type, dc.options ?? {});
      }
      if (dc.hideLabel) ctrl.hideLabel();
      if (dc.width) ctrl.width(dc.width as any);
      return ctrl;
    }),
  );

  if (detail.titleKey) inner.titleKey(detail.titleKey);
  return inner;
};

const buildFormControl = (col: JsonColumn): ControlBuilder<any> => {
  const control = ControlBuilder.properties<any>(col.id as keyof any);
  const fieldInput = col.fieldInput;

  if (fieldInput?.format === 'relation') {
    const options: any = { ...(fieldInput.options as object | undefined) };
    if (!options.colspan) options.colspan = 12;
    if (fieldInput.relationType) options.relationType = fieldInput.relationType;
    control.control('relation', options).width('full');
  } else if (fieldInput?.type === 'autocomplete') {
    const options: any = { ...(fieldInput.options as object | undefined) };
    if (!options.colspan) options.colspan = 12;
    if (fieldInput.relationType) options.relationType = fieldInput.relationType;
    // Use explicit format when set; otherwise the type itself is the format.
    const format = fieldInput.format ?? fieldInput.type;
    control.control(format, options).width('full');
  } else if (fieldInput?.detail) {
    const detailLayout = buildDetailLayout(fieldInput.detail);
    control.detailFixed(detailLayout, {
      layout: fieldInput.detail.layout === 'collapse' ? 'row' : undefined,
    });
  } else if (fieldInput?.format === 'date-range') {
    // Drive the renderer off the explicit `format` so its option-based tester
    // matches, not `type` (which for this json column is 'object' and has no
    // renderer). Mirrors the relation branch.
    const options: any = { ...(fieldInput.options as object | undefined) };
    if (!options.colspan) options.colspan = 12;
    control.control('date-range', options).width('full');
  } else {
    const options: any = fieldInput?.options ?? {};
    if (!options.colspan) options.colspan = 12;
    const type = fieldInput?.type ?? 'text';
    control.control(type, options).width('full');
  }

  if (fieldInput?.customRender) control.setCustomRender(fieldInput?.customRender);
  if (col.hideLabel) control.hideLabel();
  // Label and conditional rules are expressed in the builder chain — no post-build mutation.
  if (col.label) control.label(col.label);
  applyColumnRule(control, col);

  return control;
};

/** Build the GridLayout UI schema for a form view. */
export const buildFormUiSchema = (
  cols: JsonColumn[],
): Record<string, unknown> => {
  const layout = LayoutBuilder.grid<any>();
  for (const col of cols) layout.addControl(buildFormControl(col));
  return layout.build() as unknown as Record<string, unknown>;
};
