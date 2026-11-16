<template>
  <div>
    <!-- A popovertarget button: the browser handles open/close, light dismiss,
         Esc and aria-expanded. No role="menu" — that would promise arrow-key
         navigation this list does not implement. -->
    <button
      ref="buttonRef"
      type="button"
      :popovertarget="id"
      :class="[btnClass, 'btn btn-ghost text-right flex-nowrap flex']"
    >
      <span>{{ label }}</span>
      <Icon
        v-if="!disableArrow"
        :icon="IconEnum.ChevronDown"
        size="sm"
      />
    </button>
    <!-- popover sits on a wrapper: daisyUI's `.menu` sets display:flex, which
         would override the browser's display:none for a closed popover. -->
    <div
      :id="id"
      ref="popoverRef"
      popover
      class="m-0 p-0 border-0 bg-transparent"
      :style="style"
      @beforetoggle="onBeforeToggle"
      @click="onClick"
    >
      <ul class="menu bg-white p-2 shadow-sm text-black">
        <li
          v-for="item in items"
          :key="item.label"
          class="min-w-max flex-no-wrap"
        >
          <MenuItem v-bind="item" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';

import MenuItem from './menu-item.vue';
import { SubMenuProperties } from './sub-menu.properties';
import {
  anchoredStyle,
  fixedStyleBelow,
  supportsAnchorPositioning,
} from '../composables/anchorPosition';
import { Icon, IconEnum } from '../icons';

defineProps(SubMenuProperties);

const id = `submenu-${useId()}`;
const buttonRef = ref<HTMLButtonElement>();
const popoverRef = ref<HTMLDivElement>();
const style = ref<Record<string, string>>({});

// Place the list under the button, right-aligned. The button is the popover's
// implicit anchor (popovertarget), so CSS anchor positioning needs no JS. The
// fallback runs in `beforetoggle`, before the popover is painted, so it never
// flashes at the default centred position.
const onBeforeToggle = (event: Event) => {
  if ((event as ToggleEvent).newState !== 'open' || !buttonRef.value) return;
  style.value = supportsAnchorPositioning()
    ? anchoredStyle('end')
    : fixedStyleBelow(buttonRef.value, 'end');
};

// Close after choosing an item (links and buttons); a nested submenu trigger
// stays open because it opens its own popover instead.
const onClick = (event: MouseEvent) => {
  const target = (event.target as HTMLElement).closest('a, button');
  if (target && !target.hasAttribute('popovertarget')) popoverRef.value?.hidePopover();
};
</script>
