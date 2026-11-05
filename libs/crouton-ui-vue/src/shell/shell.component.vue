<template>
  <notifications />
  <ModalWrapper />
  <div class="flex h-screen flex-col">
    <header class="shrink-0">
      <nav class="navbar bg-primary text-primary-content w-full z-100">
        <div class="navbar-start">
          <button
            v-if="menu?.length"
            aria-label="open sidebar"
            class="btn btn-square btn-ghost p-1"
            @click="toggleSidebar"
          >
            <Icon :icon="IconEnum.Hamburger" />
          </button>
        </div>
        <div class="navbar-center">
          <a
            class="btn btn-ghost text-primary-content text-lg color-white"
            :href="baseUrl"
          >{{ title }}</a>
        </div>
        <div class="navbar-end">
          <SubMenu
            v-if="userMenu"
            v-bind="userMenu"
            :btn-class="''"
          />
        </div>
      </nav>
    </header>
    <div
      class="drawer flex-1 overflow-hidden"
      :class="{ 'drawer-open': sidebarOpen }"
    >
      <input
        id="app-drawer"
        v-model="sidebarOpen"
        type="checkbox"
        class="drawer-toggle"
      >
      <main class="drawer-content overflow-y-auto mb-2 mr-2 shadow-md">
        <slot />
      </main>
      <div class="drawer-side h-full shadow-md">
        <label
          for="app-drawer"
          aria-label="close sidebar"
          class="drawer-overlay"
        />
        <div
          class="menu bg-base-100 h-full flex flex-col justify-between"
          :style="{ width: widthSidebar + 'px' }"
        >
          <ul class="flex-grow overflow-y-auto">
            <li
              v-for="item of menu"
              :key="item.label"
            >
              <RouterLink :to="{ name: item.routerLink, params: item.params }">
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
          <div class="bg-base-200 p-4">
            version: {{ version }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import type { ShellMenu, User } from './menu.type';
import { Icon, IconEnum } from '../icons';
import { SubMenu } from '../menu';
import { ModalWrapper } from '../modal';
import Notifications from '../toast/notifications.vue';

const baseUrl = import.meta.env.BASE_URL;

const properties = withDefaults(
  defineProps<{
    title: string;
    menu: ShellMenu;
    user: User | undefined;
    version: string;
    widthSidebar?: number;
  }>(),
  { widthSidebar: 300 },
);

const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const emits = defineEmits<{ logout: [] }>();

const userMenu = computed(() => {
  return properties.user
    ? {
        label: properties.user.name,
        items: [
          {
            label: 'Logout',
            action: () => {
              emits('logout');
            },
          },
        ],
      }
    : null;
});
</script>
