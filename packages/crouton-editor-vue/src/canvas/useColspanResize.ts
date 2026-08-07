import { ref } from 'vue';

/**
 * Drag-to-resize a field card's `colspan` (`LIVE_FORM_EDITOR_PLAN.md` Phase 3).
 * Pointer events with pointer capture, measuring the drag delta against the
 * grid's own column width and snapping the live value to the nearest integer
 * 1–12 as the user drags — written on every move for instant visual feedback
 * (this is a pure client-side computation, not a network request, so there's
 * no cost concern in updating continuously; see `FormCanvasEditor.vue`'s
 * notes on why that's safe here specifically).
 */
export const useColspanResize = (
  getColspan: () => number,
  setColspan: (next: number) => void,
) => {
  const resizing = ref(false);

  let startX = 0;
  let startColspan = 12;
  let unitPx = 1;
  let pointerId: number | null = null;
  let target: HTMLElement | null = null;

  const onPointerMove = (e: PointerEvent) => {
    if (!resizing.value) return;
    const deltaCols = Math.round((e.clientX - startX) / unitPx);
    const next = Math.min(12, Math.max(1, startColspan + deltaCols));
    setColspan(next);
  };

  const stop = () => {
    if (!resizing.value) return;
    resizing.value = false;
    if (target && pointerId !== null) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // Pointer may already have been released (e.g. lost capture on scroll).
      }
    }
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stop);
    target = null;
    pointerId = null;
  };

  /** Call from a resize handle's `@pointerdown`, passing the grid container element to measure against. */
  const start = (event: PointerEvent, gridEl: HTMLElement | null) => {
    if (!gridEl || gridEl.clientWidth === 0) return;
    event.preventDefault();
    resizing.value = true;
    startX = event.clientX;
    startColspan = getColspan();
    unitPx = gridEl.clientWidth / 12;
    target = event.currentTarget as HTMLElement;
    pointerId = event.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Best-effort — resizing still works via the window listeners below.
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stop);
  };

  return { resizing, start };
};
