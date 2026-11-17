<template>
  <component
    :is="props.as"
    ref="triggerRef"
    v-bind="{ ...$attrs, ...aria.trigger }"
    :class="[
      'btn p-1 flex justify-center flex-nowrap',
      ButtonColor[props.color as Color],
      ButtonSize[props.size],
      {
        'btn-outline': props.outline,
        'btn-square': props.square,
        tooltip: props.tooltip && !nativeHint,
        'border-0': props.noBorder,
      },
    ]"
    :href="props.href"
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :data-tip="nativeHint ? undefined : props.tooltip"
    :interestfor="nativeHint && props.tooltip ? hintId : undefined"
    @click="emit('click', $event)"
  >
    <Icon
      v-if="props.icon"
      :icon="props.icon"
      :class="{ 'animate-spin': props.loading }"
    />
    <span
      v-if="$slots.default"
      class="whitespace-nowrap"
    ><slot /></span>
  </component>
  <!-- Native tooltip: shown on hover, focus or long-press; Esc dismisses it and
       the pointer can move onto it (WCAG 1.4.13). -->
  <span
    v-if="nativeHint && props.tooltip"
    :id="hintId"
    popover="hint"
    v-bind="aria.hint"
    class="btn-hint"
  >{{ props.tooltip }}</span>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUpdated, ref, useAttrs, useId } from 'vue';

import { BtnEmits, BtnProperties } from './Btn.properties';
import { hintAria, supportsNativeHint } from './hint';
import { ButtonColor, type Color } from '../const/colors';
import { ButtonSize } from '../const/size';
import { Icon } from '../icons';

// Attributes go to the button, not to the fragment that also holds the hint.
defineOptions({ inheritAttrs: false });

const props = defineProps(BtnProperties);
const emit = defineEmits(BtnEmits);
const attrs = useAttrs();

const hintId = `btn-hint-${useId()}`;
const triggerRef = ref<HTMLElement>();
// Decided after mount so server-rendered markup matches the first client render.
const nativeHint = ref(false);
// The rendered text, to compare the hint with the button's real name.
const text = ref('');
const readText = () => {
  text.value = triggerRef.value?.textContent ?? '';
};
onMounted(() => {
  nativeHint.value = supportsNativeHint();
  readText();
});
onUpdated(readText);

const aria = computed(() =>
  nativeHint.value && props.tooltip
    ? hintAria(hintId, props.tooltip, (attrs['aria-label'] as string | undefined) ?? text.value)
    : { trigger: {}, hint: {} },
);
</script>

<style>
/* Placed above its button (the implicit anchor set by interestfor). */
.btn-hint {
  inset: auto;
  margin: 0 0 4px;
  position-area: block-start;
  position-try-fallbacks: flip-block;
  border: 0;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
  background: var(--color-neutral, #374151);
  color: var(--color-neutral-content, #fff);
}
</style>
