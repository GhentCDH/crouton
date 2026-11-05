<template>
  <section v-if="enums && (enums.system.length > 0 || enums.project.length > 0)">
    <h2 class="text-lg font-semibold mb-2 text-base-content">Enums</h2>

    <StatusEnumsGroup
      v-if="enums.system.length > 0"
      class="mb-4"
      title="System Enums"
      :groups="enums.system"
    />

    <StatusEnumsGroup
      v-if="enums.project.length > 0"
      title="Project Enums"
      :groups="enums.project"
    />
  </section>
</template>

<script setup lang="ts">
import StatusEnumsGroup from './StatusEnumsGroup.vue';
import { StatusEnumsSectionProperties } from './StatusEnumsSection.properties';

const { enums } = defineProps(StatusEnumsSectionProperties);
</script>
