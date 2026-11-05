<template>
  <button
    :class="['badge gap-1', BadgeSize[props.size], BadgeColor[props.color]]"
    :type="props.type"
    :disabled="props.disabled"
    @click="emit('click')"
  >
    <slot />
    <Icon
      v-if="props.icon"
      :icon="props.icon"
      :size="props.size"
    />
  </button>
</template>

<script lang="ts" setup>
import { BtnBadgeEmits, BtnBadgeProperties } from './BtnBadge.properties';
import { BadgeColor } from '../const/colors';
import { BadgeSize } from '../const/size';
import { Icon } from '../icons';

const props = defineProps(BtnBadgeProperties);
const emit = defineEmits(BtnBadgeEmits);
</script>