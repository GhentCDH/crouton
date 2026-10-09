<template>
  <ControlWrapper v-bind="properties">
    <textarea
      :id="id"
      :aria-label="id"
      :class="[minHeight, width]"
      class="textarea textarea-bordered w-full font-mono text-sm"
      :value="(model as string) ?? ''"
      @input="onInput"
    />
  </ControlWrapper>
</template>

<script lang="ts" setup>
import { MarkdownComponentProperties, MarkdownEmits } from './MarkdownComponent.properties';
import ControlWrapper from '../core/ControlWrapper.vue';

/**
 * Plain-textarea fallback used when the optional TipTap peer dependencies are
 * not installed. It keeps the same props/model API as the rich Markdown editor
 * so it is a drop-in, editing the raw Markdown string directly.
 */
const properties = defineProps(MarkdownComponentProperties);
const emit = defineEmits(MarkdownEmits);
const model = defineModel();

const onInput = (event: Event) => {
  const value = (event.target as HTMLTextAreaElement).value;
  model.value = value;
  emit('change', value);
};
</script>
