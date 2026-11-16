let supported: boolean | undefined;

/**
 * Native hover/focus tooltips need interest invokers (`interestfor`),
 * `popover="hint"` and CSS anchor positioning (to sit next to the button).
 * Without all three, Btn keeps its CSS-only tooltip.
 */
export const supportsNativeHint = () => {
  if (supported !== undefined) return supported;
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('div');
  probe.setAttribute('popover', 'hint');
  supported =
    'interestForElement' in HTMLButtonElement.prototype &&
    probe.popover === 'hint' &&
    CSS.supports('position-area: block-start');
  return supported;
};

export type HintAria = {
  trigger: Record<string, string>;
  hint: Record<string, string>;
};

const normalize = (text: string | undefined) => text?.replace(/\s+/g, ' ').trim() ?? '';

/**
 * ARIA wiring for a hint popover, following the trigger's accessible name
 * (its aria-label, else its text):
 * - the hint repeats the name: add nothing (it would be read twice);
 * - the trigger has no name (icon-only, no aria-label): the hint becomes the name;
 * - otherwise the hint describes the trigger.
 */
export const hintAria = (
  hintId: string,
  tooltip: string,
  accessibleName: string | undefined,
): HintAria => {
  const name = normalize(accessibleName);
  if (name === normalize(tooltip)) return { trigger: {}, hint: {} };
  if (!name) return { trigger: { 'aria-labelledby': hintId }, hint: {} };
  return { trigger: { 'aria-describedby': hintId }, hint: { role: 'tooltip' } };
};
