<template><router-view /></template>

<script setup lang="ts">
import { provideWorkStore } from "../../store/work.store";
import { provideSectionStore } from "../../store/section.store";
import { getRouteParam } from "../../utils/useRouteParams";

const workStore = provideWorkStore();
const sectionStore = provideSectionStore();

const routeParams = getRouteParam();

routeParams.watch("workId", (id) => {
  if (id) workStore.setId(id);
});

routeParams.watch("sectionId", (id) => {
  if (id) sectionStore.setId(id);
});
</script>