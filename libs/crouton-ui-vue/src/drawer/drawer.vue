<template>
  <main class="flex h-full overflow-hidden gap-2">
    <aside
      v-if="hasLeft"
      id="drawer-left"
      class="min-h-0 relative flex-shrink-0 overflow-visible flex"
    >
      <div
        id="drawer-left-panel"
        :style="{ width: open.left ? widthLeft + 'px' : '0px' }"
        class="h-full overflow-hidden shadow-sm transition-[width] duration-300 ease-in-out"
        :class="[drawerColor]"
      >
        <div
          :style="{ width: widthLeft + 'px' }"
          class="h-full overflow-y-auto p-4"
        >
          <slot name="left-drawer" />
        </div>
      </div>
      <button
        :aria-expanded="open.left"
        aria-controls="drawer-left-panel"
        :aria-label="open.left ? 'Collapse left panel' : 'Expand left panel'"
        class="hover:bg-base-300 hover:text-base-content transition-colors cursor-pointer"
        @click="toggle('left')"
      >
        <Icon
          :size="'lg'"
          :icon="open.left ? IconEnum.ChevronLeft : IconEnum.ChevronRight"
        />
      </button>
    </aside>
    <div class="flex-1 overflow-y-auto bg-white">
      <slot />
    </div>
    <aside
      v-if="hasRight"
      class="min-h-0 relative flex-shrink-0 bg-white overflow-visible flex"
    >
      <button
        :aria-expanded="open.right"
        aria-controls="drawer-right-panel"
        :aria-label="open.right ? 'Collapse right panel' : 'Expand right panel'"
        class="hover:bg-base-300 hover:text-base-content transition-colors cursor-pointer"
        @click="toggle('right')"
      >
        <Icon
          :size="'lg'"
          :icon="open.right ? IconEnum.ChevronRight : IconEnum.ChevronLeft"
        />
      </button>
      <div
        id="drawer-right-panel"
        :style="{ width: open.right ? widthRight + 'px' : '0px' }"
        class="h-full overflow-hidden shadow-sm transition-[width] duration-300 ease-in-out"
        :class="[drawerColor]"
      >
        <div
          :style="{ width: widthRight + 'px' }"
          class="h-full overflow-y-auto p-4"
        >
          <slot name="right-drawer" />
        </div>
      </div>
    </aside>
  </main>
</template>

<script lang="ts" setup>
import { computed, ref, useSlots } from 'vue';

import { DrawerProperties } from './drawer.properties';
import { Icon, IconEnum } from '../icons';

const props = defineProps(DrawerProperties);
const slots = useSlots();

const hasLeft = computed(() => !!slots['left-drawer']);
const hasRight = computed(() => !!slots['right-drawer']);

const open = ref({
  left: props.initialLeftOpen,
  right: props.initialRightOpen,
});

const toggle = (side: 'left' | 'right') => {
  open.value[side] = !open.value[side];
};
</script>
