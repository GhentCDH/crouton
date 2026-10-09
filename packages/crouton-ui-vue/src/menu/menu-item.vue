<template>
  <SubMenu
    v-if="isSubMenu"
    v-bind="properties"
    :btn-class="btnClass"
  />
  <RouterLink
    v-else-if="isLink"
    :to="goTo"
    :class="btnClass"
    @click="onClick"
  >
    {{ label }}
  </RouterLink>
  <button
    v-else-if="isButton"
    :class="btnClass"
    @click="onClick"
  >
    {{ label }}
  </button>
  <div
    v-else
    :class="[btnClass, { 'btn-disabled': disabled }]"
  >
    {{ label }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationAsRelativeGeneric } from 'vue-router';

import type { MenuWithItems } from './menu.type';
import SubMenu from './sub-menu.vue';

const btnClass =
  'btn btn-ghost text-left justify-between min-w-max font-normal';
const properties = withDefaults(defineProps<MenuWithItems>(), {
  disabled: false,
});

const isLink = computed(() => {
  return (
    !properties.disabled &&
    properties.action &&
    'routerLink' in properties.action
  );
});
const isButton = computed(() => {
  return !properties.disabled && properties.action;
});

const isSubMenu = computed(() => {
  return properties.items?.length;
});

const goTo = computed(() => {
  const action = properties.action;
  if (action && 'routerLink' in action && 'params' in action)
    return {
      name: action.routerLink,
      params: action.params,
    } as RouteLocationAsRelativeGeneric;

  return '';
});

const onClick = () => {
  properties.action?.();
};
</script>
