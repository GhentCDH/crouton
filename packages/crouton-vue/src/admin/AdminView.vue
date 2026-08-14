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

          <!-- Dev-only: visual resource builder's database sync tools. -->

          <!-- Dev-only: add hidden/draft resources to sidebar menu. -->
          <li v-if="app.isDev.value" class="relative">
            <button
              class="text-sm text-gray-500 hover:text-gray-800"
              @click="toggleAddResource"
            >
              + Add resource
            </button>
            <ul
              v-if="addResourceOpen"
              class="absolute left-0 z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow-lg"
            >
              <li v-if="availableResources.length === 0" class="p-2 text-sm text-gray-400">
                No hidden or draft resources
              </li>
              <li
                v-for="r in availableResources"
                :key="r.name"
                class="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                @click="addResourceToMenu(r.name)"
              >
                {{ r.name }}
                <span class="ml-1 text-xs text-gray-400">({{ r.state }})</span>
              </li>
            </ul>
          </li>
        </ul>
        <ul class="menu w-full">
          <li v-if="app.isDev.value">
            <RouterLink
              :to="{ name: CROUTON_DEV_RESOURCES }"
              active-class="bg-white font-bold"
            >
              Dev tools
            </RouterLink>
          </li>
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
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

import { CROUTON_DEV_RESOURCES, CROUTON_FORM } from '../router';
import { isSidebarGroup } from '../composables/sidebar';
import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';

const app = useCrouton();

interface VisibilityResource {
  name: string;
  state: 'in-menu' | 'hidden' | 'draft' | 'error';
}

const addResourceOpen = ref(false);
const availableResources = ref<VisibilityResource[]>([]);

const toggleAddResource = async () => {
  if (addResourceOpen.value) {
    addResourceOpen.value = false;
    return;
  }
  try {
    const api = useApi();
    const res = await api.get('/_app/resources/visibility');
    availableResources.value = (
      res.data.resources as VisibilityResource[]
    ).filter((r) => r.state === 'draft' || r.state === 'hidden');
    addResourceOpen.value = true;
  } catch (err) {
    console.error('Failed to fetch resource visibility', err);
  }
};

const addResourceToMenu = async (name: string) => {
  try {
    const api = useApi();
    await api.post(`/_app/resources/${encodeURIComponent(name)}/add-to-menu`);
    addResourceOpen.value = false;
    await app.refreshLayout();
  } catch (err) {
    console.error('Failed to add resource to menu', err);
  }
};
</script>
