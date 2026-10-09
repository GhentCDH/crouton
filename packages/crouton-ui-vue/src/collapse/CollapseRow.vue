<template>
  <li class="list-row">
    <div class="list-col-grow">
      <div v-if="title">
        {{ title }}
      </div>
      <div
        v-if="description || descriptionLink"
        class="text-xs text-gray-600"
      >
        <a
          v-if="descriptionLink"
          :href="descriptionLink"
          target="_blank"
        >
          {{ description ?? descriptionLink }}
        </a>
        <span v-else>{{ description }}</span>
      </div>
    </div>
    <div
      v-if="label"
      class="text-xs text-gray-500"
    >
      <a
        v-if="labelLink"
        :href="labelLink"
        target="_blank"
      >
        {{ label }}
      </a>
      <span v-else>{{ label }}</span>
    </div>
    <slot />
  </li>
</template>

<script lang="ts" setup>
import { CollapseRowProperties } from './CollapseRow.properties';

defineProps(CollapseRowProperties);
</script>
