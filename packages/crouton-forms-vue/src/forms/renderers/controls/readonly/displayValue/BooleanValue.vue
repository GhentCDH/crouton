<template>
  <span
    v-if="displayValue === true"
    class="inline-flex items-center gap-1 text-success"
  >
    <Icon
      :icon="IconEnum.Check"
      size="sm"
    />
    <span>Yes</span>
  </span>
  <span
    v-else-if="displayValue === false"
    class="inline-flex items-center gap-1 text-base-content/50"
  >
    <Icon
      :icon="IconEnum.Close"
      size="sm"
    />
    <span>No</span>
  </span>
  <NotSetValue v-else />
</template>

<script setup lang="ts">
import { Icon, IconEnum } from '@ghentcdh/ui';

import NotSetValue from './NotSetValue.vue';
import { DisplayValueProperties } from './displayValue.properties';

defineProps(DisplayValueProperties);
</script>
