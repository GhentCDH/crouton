import { type Ref, onUnmounted, watch } from 'vue';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
};

export type UseFocusTrapOptions = {
  containerRef: Ref<HTMLElement | null>;
  isActive: Ref<boolean>;
  onEscape?: () => void;
  restoreFocus?: boolean;
};

export const useFocusTrap = ({
  containerRef,
  isActive,
  onEscape,
  restoreFocus = true,
}: UseFocusTrapOptions) => {
  let previouslyFocused: HTMLElement | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
    const container = containerRef.value;
    if (!container) return;

    if (event.key === 'Escape') {
      onEscape?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const activate = () => {
    const container = containerRef.value;
    if (!container) return;

    previouslyFocused = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleKeyDown);

    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  };

  const deactivate = () => {
    document.removeEventListener('keydown', handleKeyDown);

    if (restoreFocus && previouslyFocused) {
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  };

  watch(isActive, (active) => {
    if (active) activate();
    else deactivate();
  }, { immediate: true });

  onUnmounted(() => {
    deactivate();
  });
};
