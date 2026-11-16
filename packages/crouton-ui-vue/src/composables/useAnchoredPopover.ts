import { type Ref, onBeforeUnmount, ref, watch } from 'vue';

export type UseAnchoredPopoverOptions = {
  /** Element the popover is placed under. Pointer presses inside it do not dismiss. */
  anchorRef: Ref<HTMLElement | null | undefined>;
  /** Element carrying the `popover="manual"` attribute. */
  popoverRef: Ref<HTMLElement | null | undefined>;
  /** Source of truth for open/closed; the popover follows it. */
  isOpen: Ref<boolean>;
  /** Called on a pointer press outside both the anchor and the popover. */
  onDismiss: () => void;
  /** Make the popover exactly as wide as the anchor. */
  matchWidth?: boolean;
};

const supportsPopover = (el: HTMLElement) => typeof el.showPopover === 'function';

/**
 * Show a `popover="manual"` element under an anchor. The top layer means no
 * teleport, no clipping by `overflow: hidden`, and no getting stuck under a
 * modal `<dialog>`.
 *
 * Why `manual` and not `auto`: the anchor is an input, not a `popovertarget`
 * button, so `auto` light dismiss would close the popover on every press in
 * the input (and its async `toggle` event races the input's own click).
 * Outside presses are detected here instead; callers handle Esc.
 *
 * ponytail: JS positioning, refreshed on scroll/resize while open; switch to
 * CSS anchor positioning (`position-area` + `position-try-fallbacks`) once
 * it is Baseline.
 *
 * Without Popover API support the element stays an ordinary fixed-position
 * element, so callers should still toggle its content with `v-if`.
 */
export const useAnchoredPopover = ({
  anchorRef,
  popoverRef,
  isOpen,
  onDismiss,
  matchWidth = false,
}: UseAnchoredPopoverOptions) => {
  const style = ref<Record<string, string>>({});

  const updatePosition = () => {
    const anchor = anchorRef.value;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    style.value = {
      position: 'fixed',
      margin: '0',
      right: 'auto',
      bottom: 'auto',
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      ...(matchWidth ? { width: `${rect.width}px` } : {}),
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Node;
    if (anchorRef.value?.contains(target) || popoverRef.value?.contains(target)) return;
    onDismiss();
  };

  const listen = (on: boolean) => {
    const method = on ? 'addEventListener' : 'removeEventListener';
    // Capture so scrolling inside any container (e.g. a modal body) repositions.
    window[method]('scroll', updatePosition, true);
    window[method]('resize', updatePosition);
    document[method]('pointerdown', onPointerDown as EventListener, true);
  };

  const show = () => {
    updatePosition();
    listen(true);
    const el = popoverRef.value;
    if (el && supportsPopover(el) && !el.matches(':popover-open')) el.showPopover();
  };

  const hide = () => {
    listen(false);
    const el = popoverRef.value;
    if (el && supportsPopover(el) && el.matches(':popover-open')) el.hidePopover();
  };

  watch(isOpen, (open) => (open ? show() : hide()), { flush: 'post' });

  onBeforeUnmount(() => listen(false));

  return { style };
};
