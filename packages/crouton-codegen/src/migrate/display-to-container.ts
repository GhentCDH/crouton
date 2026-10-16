/**
 * Block 2 codemod.
 *
 * `migrateDisplayToContainer` — moves deprecated root keys into layout.container:
 *   - `display.mode`            → layout.form.container.mode + layout.view.container.mode
 *   - `modalSize`               → layout.form.container.size (and view)
 *   - `display.customComponent` → layout.view.component
 */

type RawNode = Record<string, unknown>;

export type DisplayMigrationReport = {
  changed: boolean;
  movedDisplay: boolean;
  movedModalSize: boolean;
  movedCustomComponent: boolean;
};

export const migrateDisplayToContainer = (
  resource: Record<string, unknown>,
): { resource: Record<string, unknown>; report: DisplayMigrationReport } => {
  const report: DisplayMigrationReport = {
    changed: false,
    movedDisplay: false,
    movedModalSize: false,
    movedCustomComponent: false,
  };

  const hasDisplay = 'display' in resource;
  const hasModalSize = 'modalSize' in resource;
  if (!hasDisplay && !hasModalSize) return { resource, report };

  const display = resource['display'] as RawNode | undefined;
  const modalSize = resource['modalSize'] as string | undefined;
  const mode = (display?.['mode'] as string | undefined) ?? 'modal';
  const size = modalSize ?? 'sm';
  const component = (display?.['customComponent'] as string | null | undefined) ?? null;

  const layout = ((resource['layout'] as RawNode | undefined) ?? {}) as RawNode;
  const existingForm = (layout['form'] as RawNode | undefined) ?? {};
  const existingView = (layout['view'] as RawNode | undefined) ?? {};

  const newForm: RawNode = {
    ...existingForm,
    container: { ...((existingForm['container'] as RawNode | undefined) ?? {}), mode, size },
  };
  const newView: RawNode = {
    ...existingView,
    container: { ...((existingView['container'] as RawNode | undefined) ?? {}), mode, size },
    ...(component ? { component } : {}),
  };

  const { display: _d, modalSize: _m, ...rest } = resource;
  const result: Record<string, unknown> = {
    ...rest,
    layout: { ...layout, form: newForm, view: newView },
  };

  return {
    resource: result,
    report: {
      changed: true,
      movedDisplay: hasDisplay,
      movedModalSize: hasModalSize,
      movedCustomComponent: !!component,
    },
  };
};
