<template>
  <component
    :is="resolvedIcon"
    v-if="resolvedIcon"
    aria-hidden="true"
    :class="[
      {
        'w-full h-full': !size,
        'w-2 h-2': size === 'xs',
        'w-4 h-4': size === 'sm',
        'w-6 h-6': size === 'lg',
        'w-8 h-8': size === 'xl',
      },
    ]"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { IconProperties } from './Icon.properties';
import type { IconDef } from './icon-list';
import { IconMap } from './icon-list';

const props = defineProps(IconProperties);

const resolvedIcon = computed(() => {
  if (!props.icon) return null;
  if (typeof props.icon === 'string') return IconMap[props.icon as IconDef];
  return props.icon;
});
</script>