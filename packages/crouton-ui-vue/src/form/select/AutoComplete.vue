<template>
  <SelectWrapper
    v-bind="props"
    :options="results"
    :is-loading="isLoading"
    :is-open="isOpen"
    :query="query"
    @close="close"
    @select="select"
    @clear="clear"
  >
    <input
      ref="inputRef"
      type="text"
      role="combobox"
      :aria-label="label"
      :aria-expanded="isOpen"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      autocomplete="off"
      data-lpignore="true"
      data-bwignore="true"
      autocorrect="off"
      spellcheck="false"
      :class="[style, 'w-full']"
      :value="query"
      :placeholder="placeholder"
      :disabled="!enabled"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    >
  </SelectWrapper>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

import { AutocompleteProperties } from './AutoComplete.properties';
import type { OptionValue } from './ListResults.properties';
import SelectWrapper from './SelectWrapper.vue';
import { useOptions } from './composables/useOptions';
import { useAutoCompleteSearch } from './composables/useSearch';
import type { ControlEmits } from '../core/emits';
import { mergeStyles } from '../core/styles';
import { buildInputStyle } from '../core/utils/style'; // ─── Props ────────────────────────────────────────────────────────────────────

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps(AutocompleteProperties);

const emit = defineEmits<ControlEmits>();

// ─── State ───────────────────────────────────────────────────────────────────
const inputRef = ref<HTMLInputElement | null>(null);
const query = ref('');
const isOpen = ref(false);

const autoCompleteSearch = useAutoCompleteSearch(props);
const { isLoading, triggerSearch, clear: clearSearch } = autoCompleteSearch;

const optionsHelper = useOptions(props);
const { options: results } = optionsHelper;

watch(
  () => autoCompleteSearch.results.value,
  () => {
    optionsHelper.setOptions(autoCompleteSearch.results.value);
  },
  { immediate: true },
);
// ─── Sync external modelValue → query display ────────────────────────────────
const labelOf = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '';
  return String(typeof val === 'object' ? (val as Record<string, unknown>)[props.labelKey] ?? '' : val);
};

watch(
  () => props.modelValue,
  (val) => {
    const display = labelOf(val);
    if (display !== query.value) query.value = display;
  },
  { immediate: true },
);

// ─── Input events ────────────────────────────────────────────────────────────
const onInput = (e: Event) => {
  query.value = (e.target as HTMLInputElement).value;
  if (props.freeText) emit('update:modelValue', query.value);
  else emit('update:modelValue', '');
  triggerSearch(query.value);
  isOpen.value = true;
};

const onFocus = () => {
  triggerSearch(query.value);
  isOpen.value = true;
};

function onBlur() {
  // Small delay so click on list item fires first
  setTimeout(() => {
    isOpen.value = false;
    if (props.freeText) {
      emit('change', query.value);
    } else if (!query.value && props.modelValue) {
      // Text deleted → the selection is cleared too (`clear` lets relation
      // pickers persist an explicit null).
      emit('update:modelValue', '');
      emit('change', undefined);
      emit('clear');
    } else {
      // Unmatched text without a pick → show the current selection again.
      query.value = labelOf(props.modelValue);
    }
  }, 150);
}

// ─── Select item ─────────────────────────────────────────────────────────────
const select = (item: OptionValue) => {
  const original = optionsHelper.getOriginal(item);
  query.value = item.label;
  isOpen.value = false;
  emit('update:modelValue', original);
  emit('change', original);
};

// ─── Clear ───────────────────────────────────────────────────────────────────
const clear = () => {
  query.value = '';
  clearSearch();
  isOpen.value = false;
  emit('update:modelValue', '');
  emit('clear');
  nextTick(() => inputRef.value?.focus());
};

// ─── Close ───────────────────────────────────────────────────────────────────
const close = () => {
  isOpen.value = false;
};

const styles = computed(() => mergeStyles(props.styles));
const style = computed(() =>
  buildInputStyle(styles.value.control.select, props),
);
</script>
