<template>
  <Btn
    color="ghost"
    class="border-gray-300 text-primary h-8 max-w-md overflow-hidden [&>span]:flex [&>span]:min-w-0"
    style="max-width: 200px"
    :tooltip="labelValue"
    @click="emit('view', value)"
  >
    <span class="px-2 flex gap-2 items-center min-w-0 overflow-hidden">
      <span class="truncate"
        >{{ labelValue }}
        <small v-if="description" class="text-gray-500">
          {{ description }}
        </small>
      </span>
      <Icon :icon="IconEnum.View" size="sm" class="shrink-0" />
    </span>
  </Btn>
</template>

<script setup lang="ts">
import { Btn, Icon, IconEnum } from '@ghentcdh/ui';
import { computed, PropType } from 'vue';

const props = defineProps({
  displayKey: { type: String, required: true as const },
  descriptionKey: { type: String, required: false },
  value: { type: Object as PropType<unknown>, required: true as const },
});

const emit = defineEmits(['view']);

const getNestedValue = (path: string): unknown => {
  const value = props.value;
  return path.split('.').reduce<unknown>((obj, key) => {
    return obj != null && typeof obj === 'object'
      ? (obj as Record<string, unknown>)[key]
      : undefined;
  }, value);
};

const labelValue = computed(() => {
  const displayKey = props.displayKey ?? 'id';

  return getNestedValue(displayKey);
});

const description = computed(() => {
  const descriptionKey = props.descriptionKey;

  if (!descriptionKey) return null;
  return getNestedValue(descriptionKey);
});
</script>
