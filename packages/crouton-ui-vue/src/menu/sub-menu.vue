<template>
  <div class="dropdown dropdown-end">
    <div
      tabindex="0"
      role="button"
      aria-haspopup="menu"
      :class="[btnClass, 'btn btn-ghost text-right flex-nowrap flex']"
    >
      <span> {{ label }}</span>
      <Icon
        v-if="!disableArrow"
        :icon="IconEnum.ChevronDown"
        size="sm"
      />
    </div>
    <ul
      tabindex="0"
      role="menu"
      class="menu dropdown-content bg-white z-1 mt-4 p-2 shadow-sm"
    >
      <li class="min-w-max flex-no-wrap text-black">
        <MenuItem
          v-for="item in items"
          :key="item.label"
          v-bind="item"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import MenuItem from './menu-item.vue';
import type { MenuWithItems } from './menu.type';
import { Icon, IconEnum } from '../icons';

defineProps<MenuWithItems & { btnClass: string; disableArrow?: boolean }>();
</script>
