<template>
  <component
    :is="props.as"
    :class="[
      'btn p-1 flex justify-center flex-nowrap',
      ButtonColor[props.color as Color],
      ButtonSize[props.size],
      {
        'btn-outline': props.outline,
        'btn-square': props.square,
        tooltip: props.tooltip,
        'border-0': props.noBorder,
      },
    ]"
    :href="props.href"
    :type="props.type"
    :disabled="props.disabled"
    :data-tip="props.tooltip"
    @click="emit('click')"
  >
    <Icon
      v-if="props.icon"
      :icon="props.icon"
    />
    <span
      v-if="$slots.default"
      class="whitespace-nowrap"
    ><slot /></span>
  </component>
</template>

<script lang="ts" setup>
import { BtnEmits, BtnProperties } from './Btn.properties';
import { ButtonColor, type Color } from '../const/colors';
import { ButtonSize } from '../const/size';
import { Icon } from '../icons';

const props = defineProps(BtnProperties);
const emit = defineEmits(BtnEmits);
</script>
