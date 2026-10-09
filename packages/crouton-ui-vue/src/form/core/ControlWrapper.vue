<template>
  <fieldset
    class="fieldset"
    :class="[width, mergedStyles.control.wrapper]"
  >
    <legend
      class="w-full inline-block"
      :class="[
        mergedStyles.control.label,
        { 'p-0 h-0 leading-none': hideLabel },
      ]"
    >
      <template v-if="!hideLabel">
        <div class="flex items-center justify-between mb-2">
          <div>
            <span>{{ label }}</span>
            <span v-if="showAsterisk">*</span>
          </div>
          <slot name="label-action" />
        </div>
      </template>
    </legend>
    <slot />
    <p
      v-if="!hideErrors"
      :class="['fieldset-label h-4', { 'text-error': showErrors }]"
    >
      {{ showErrors ? errors : showDescription ? description : null }}
    </p>
  </fieldset>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { ControlWrapperProperties } from './ControlWrapper.properties'; // TODO check what is used?
import { mergeStyles } from './styles';
import { isDescriptionHidden, showErrors as _showErrors } from './utils/style'; // TODO check what is used?

defineOptions({ inheritAttrs: false });

// TODO check what is used?
const properties = defineProps(ControlWrapperProperties);

const showDescription = computed(() => {
  return !isDescriptionHidden(
    properties.visible,
    properties.description,
    properties.isFocused,
    true,
  );
});

const showAsterisk = computed(() => {
  return properties.required;
});

const showErrors = computed(() => {
  return _showErrors(properties);
});

const mergedStyles = computed(() => mergeStyles(properties.styles));
</script>
