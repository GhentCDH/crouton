export const addClickOutsideEventListener = (
  targetElement: any,
  callback: () => void,
) => {
  if (!targetElement) return null;
  const eventListener = (event: Event) => {
    if (!targetElement.contains(event.target)) {
      callback();
    }
  };

  document.addEventListener('click', eventListener);

  return eventListener;
};

export const removeClickOutsideEventListener = (eventListener: any) => {
  document.removeEventListener('click', eventListener);
};

export const ClickOutside = {
  beforeMount(el: any, binding: any) {
    el.clickOutsideEvent = function (event: Event) {
      // Check if the clicked element is neither the element
      // to which the directive is applied nor its child
      if (!(el === event.target || el.contains(event.target))) {
        // Invoke the provided method
        binding.value(event);
      }
    };
    document.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el: any) {
    // Remove the event listener when the bound element is unmounted
    document.removeEventListener('click', el.clickOutsideEvent);
  },
};
