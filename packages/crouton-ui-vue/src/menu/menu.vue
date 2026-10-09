<template>
  <nav class="navbar bg-base-100 shadow-sm">
    <div class="flex-1">
      <div
        v-if="breadcrumbs"
        class="breadcrumbs text-sm"
      >
        <ul>
          <li
            v-for="breadcrumb in breadcrumbs"
            :key="breadcrumb.label"
          >
            <RouterLink
              v-if="breadcrumb.routerLink"
              :to="{ name: breadcrumb.routerLink, params: breadcrumb.params }"
              role="navigation"
              :aria-label="breadcrumb.label"
            >
              {{ breadcrumb.label }}
            </RouterLink>
            <template v-else>
              {{ breadcrumb.label }}
            </template>
          </li>
        </ul>
      </div>
    </div>
    <div class="flex grow justify-end px-2">
      <div class="flex items-stretch">
        <MenuItem
          v-for="item in menu"
          :key="item.label"
          v-bind="item"
        />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import MenuItem from './menu-item.vue';
import type { Breadcrumb, MenuWithItems } from './menu.type';

defineProps<{
  menu: Array<MenuWithItems>;
  breadcrumbs?: Array<Breadcrumb>;
}>();
</script>
