<template>
  <Btn
    :disabled="disabled"
    :square="true"
    size="xs"
    :color="color"
    @click="goToPage()"
  >
    {{ label }}
  </Btn>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { PaginationButtonEmits, PaginationButtonProperties } from './pagination-button.component.properties';
import { Btn } from '../button';
import { Color } from '../const/colors';

const props = defineProps(PaginationButtonProperties);
const emit = defineEmits(PaginationButtonEmits);

const activePage = computed(() =>
  props.neverActive ? false : props.page === props.currentPage,
);

const color = computed(() => {
  if (props.neverActive) {
    return Color.blank;
  }

  return activePage.value ? Color.primary : Color.secondary;
});

const goToPage = () => {
  emit('updatePage', props.page);
};
</script>
