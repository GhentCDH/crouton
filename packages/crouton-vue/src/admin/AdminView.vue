<template>
  <Drawer class="_h-full" :width-left="250" :drawer-color="'bg-base-200'">
    <router-view />

    <template #left-drawer>
      <div class="gap-2 flex flex-col h-full">
        <h2>{{ app.title }} Admin</h2>
        <ul class="menu w-full gap-2 flex-1 flex-grow h-full">
          <template v-for="node in app.sidebar" :key="node.id">
            <!-- Group with children -->
            <li v-if="isSidebarGroup(node)">
              <details open>
                <summary class="font-semibold">{{ node.label }}</summary>
                <ul>
                  <li v-for="child in node.children" :key="child.id">
                    <RouterLink
                      :to="{ name: CROUTON_FORM, params: { formId: child.id } }"
                      active-class="bg-white font-bold"
                    >
                      {{ child.label }}
                    </RouterLink>
                  </li>
                </ul>
              </details>
            </li>

            <!-- Top-level leaf item -->
            <li v-else>
              <RouterLink
                :to="{ name: CROUTON_FORM, params: { formId: node.id } }"
                active-class="bg-white font-bold"
              >
                {{ node.label }}
              </RouterLink>
            </li>
          </template>
        </ul>

        <div class="bg-base-200 p-4 text-gray-500 text-sm">
          version: {{ app.version }}
        </div>
      </div>
    </template>
  </Drawer>
</template>
<script setup lang="ts">
import { Drawer } from '@ghentcdh/ui';
import { RouterLink } from 'vue-router';

import { CROUTON_FORM } from '../router';
import { isSidebarGroup } from '../composables/sidebar';
import { useCrouton } from '../composables/useCrouton';

const app = useCrouton();
</script>
