<template>
  <SubMenu
    :items="items"
    :label="'test'"
    :open="open"
    :btn-class="''"
    :disable-arrow="true"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { MenuWithItems } from './menu.type';
import SubMenu from './sub-menu.vue';

defineProps<{
  items: Array<MenuWithItems>;
}>();

const open = ref(true);

</script>
