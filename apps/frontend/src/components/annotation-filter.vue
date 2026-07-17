<template>
  <Filter
    v-model="store.selectedAnnotationTypes"
    title="Annotation filter"
    :items="items"
    color-key="color"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Filter } from "@ghentcdh/ui";
import { useAnnotationDefinitions } from "@ghentcdh/annotation-vue";

const annotationDefinitions = useAnnotationDefinitions();

const store = useAnnotationDefinitions();

const items = computed(() => {
  const grouped = store.annotationsGroupedByPurpose;
  return annotationDefinitions.definitions.map((def) => {
    return {
      id: def.id,
      label: def.label,
      color: def.style.default?.backgroundColor,
      count: grouped[def.id]?.length ?? 0,
    };
  });
});
</script>
