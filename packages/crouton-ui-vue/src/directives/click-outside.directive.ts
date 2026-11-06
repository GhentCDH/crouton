type ClickOutsideElement = HTMLElement & { clickOutsideEvent?: (event: Event) => void };

export const addClickOutsideEventListener = (
  targetElement: HTMLElement | null,
  callback: () => void,
) => {
  if (!targetElement) return null;
  const eventListener = (event: Event) => {
    if (!targetElement.contains(event.target as Node)) {
      callback();
    }
  };

  document.addEventListener('click', eventListener);

  return eventListener;
};

export const removeClickOutsideEventListener = (eventListener: (event: Event) => void) => {
  document.removeEventListener('click', eventListener);
};

export const ClickOutside = {
  beforeMount(el: ClickOutsideElement, binding: { value: (event: Event) => void }) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el: ClickOutsideElement) {
    if (el.clickOutsideEvent) document.removeEventListener('click', el.clickOutsideEvent);
  },
};
