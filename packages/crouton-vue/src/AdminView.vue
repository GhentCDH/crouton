<template>
  <Drawer class="_h-full" :width-left="250" :drawer-color="'bg-base-200'">
    <router-view />

    <template #left-drawer>
      <div class="gap-2 flex flex-col">
        <h2>{{ app.title }} Admin</h2>
        <ul class="menu w-full gap-2">
          <li v-for="side in app.sidebar" :key="side.label">
            <RouterLink
              :to="{ name: side.routerLink, params: side.params }"
              active-class="bg-white text-bold"
            >
              {{ side.label }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </Drawer>
</template>
<script setup lang="ts">
import { Drawer } from '@ghentcdh/ui';
import { useCrouton } from './consumable/useCrouton';
import { RouterLink } from 'vue-router';

const app = useCrouton();
</script>
