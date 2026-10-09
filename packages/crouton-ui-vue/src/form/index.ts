import { defineAsyncComponent } from 'vue';

import MarkdownFallback from './text/MarkdownFallback.vue';

export { default as SelectComponent } from './select/SelectComponent.vue';
export { default as ControlWrapper } from './core/ControlWrapper.vue';
export * from './core/ControlWrapper.properties';
export { default as Autocomplete } from './select/AutoComplete.vue';
export { default as MultiSelect } from './select/MultiSelect.vue';
export * from './core/styles';
export * from './core/utils/style';
export * from './core/properties';

/**
 * The rich Markdown editor pulls in TipTap, which is an *optional* peer
 * dependency. It is loaded lazily so consumers that never render Markdown do
 * not need TipTap installed. If the import fails (TipTap absent), it degrades
 * to a plain-textarea fallback instead of crashing.
 */
export const Markdown = defineAsyncComponent({
  loader: () => import('./text/Markdown.vue'),
  errorComponent: MarkdownFallback,
  onError(error, _retry, fail) {
    console.warn(
      '[@ghentcdh/crouton-ui-vue] Markdown editor could not load — install the TipTap peer ' +
        'dependencies (@tiptap/pm, @tiptap/starter-kit, @tiptap/vue-3, tiptap-markdown) ' +
        'to enable it. Falling back to a plain textarea.',
      error,
    );
    fail();
  },
});

export { default as Checkbox } from './Checkbox.vue';
export { default as Input } from './Input.vue';
export { default as InputNumber } from './InputNumber.vue';
export { default as Textarea } from './Textarea.vue';
