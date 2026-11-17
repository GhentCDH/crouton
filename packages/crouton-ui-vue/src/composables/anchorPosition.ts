/**
 * Horizontal alignment of a popover placed below its anchor:
 * `start` lines up the left edges, `end` the right edges.
 */
export type AnchorAlign = 'start' | 'end';

type Style = Record<string, string>;

const GAP = '4px';

const POSITION_AREA: Record<AnchorAlign, string> = {
  start: 'block-end span-inline-end',
  end: 'block-end span-inline-start',
};

/** True when the browser supports CSS anchor positioning (`position-area`). */
export const supportsAnchorPositioning = () =>
  typeof CSS !== 'undefined' && CSS.supports('position-area: block-end');

/**
 * Style that places a popover below its *implicit* anchor: the
 * `popovertarget` button, or the `source` passed to `showPopover()`.
 * The browser keeps it attached while scrolling and flips it when it would
 * overflow the viewport.
 */
export const anchoredStyle = (align: AnchorAlign, matchWidth = false): Style => ({
  inset: 'auto',
  margin: `${GAP} 0 0`,
  'position-area': POSITION_AREA[align],
  'position-try-fallbacks': 'flip-block, flip-inline',
  ...(matchWidth ? { width: 'anchor-size(width)' } : {}),
});

/**
 * Fallback for browsers without anchor positioning: fixed coordinates from
 * the anchor's current rect. Recompute it whenever the anchor may have moved.
 */
export const fixedStyleBelow = (
  anchor: HTMLElement,
  align: AnchorAlign,
  matchWidth = false,
): Style => {
  const rect = anchor.getBoundingClientRect();
  return {
    position: 'fixed',
    margin: '0',
    bottom: 'auto',
    top: `${rect.bottom + 4}px`,
    ...(align === 'start'
      ? { left: `${rect.left}px`, right: 'auto' }
      : { right: `${window.innerWidth - rect.right}px`, left: 'auto' }),
    ...(matchWidth ? { width: `${rect.width}px` } : {}),
  };
};
