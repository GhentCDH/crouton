<template>
  <div class="truncate">
    <component :is="displayComponent" :value="value" :options="options" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getDisplayComponent, type ReadonlyOpts } from '../forms/renderers/controls/composables/useReadonlyBinding';

const props = defineProps({
  data: { type: Object, required: true },
  column: { type: Object, required: true },
  options: { type: Object },
});

const value = computed(() => {
  const col = props.column as { options?: { dataPath?: string }; id?: string };
  const dataPath = col.options?.dataPath ?? col.id;
  const val = (props.data as Record<string, unknown>)[dataPath ?? ''];
  if (val === null || val === undefined) return null;
  return val;
});

const displayComponent = computed(() =>
  getDisplayComponent(value.value, (props.options ?? {}) as ReadonlyOpts),
);

// const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

// const { wrapper, displayWrapper } = useReadonlyControlBinding(
//   props.uischema,
//   props.schema,
// );
</script>
