<template>
  <ShellComponent
    :title="app.title"
    :version="app.version"
    :width-sidebar="200"
    :menu="sidebar"
  >
    <router-view />
  </ShellComponent>
</template>

<script setup lang="ts">
import { ShellComponent } from '@ghentcdh/ui';
import { useCrouton } from '@ghentcdh/crouton-vue';
import { computed } from 'vue';

const app = useCrouton();
const sidebar = computed(() => [
  // { label: "Works", routerLink: CROUTON_FORM },
  // { label: "Metadata", routerLink: CROUTON_FORM },
]);
</script>
