<template>
  <Btn
    v-if="label"
    :outline="true"
    size="xs"
    class="px-5 text-gray-500 border-gray-300 max-w-96 [&>span]:flex [&>span]:min-w-0"
    @click="openDetails"
  >
    <div class="truncate min-w-0">{{ label }}</div>
  </Btn>
</template>

<script lang="ts" setup>
import { type PropType, computed } from 'vue';
import { Btn, ModalService } from '@ghentcdh/crouton-ui-vue';
import RelationModal from './RelationModal.vue';
import { useResources } from '../resource';
import { computedAsync } from '../utils/computedAsync';
import { useCrouton } from '../composables/useCrouton';

const props = defineProps({
  data: { type: Object as PropType<Record<string, unknown>>, required: true as const },
  column: { type: Object as PropType<{ id: string; label?: string }>, required: true as const },
  options: { type: Object as PropType<Record<string, unknown>> },
});

const isManyToOne = computed(() => props.options?.relationType === 'manyToOne');

// A manyToOne on its FK column points at the included relation object via
// `relationField`; fall back to the raw FK when the relation is not included.
const value = computed(() => {
  const field = props.options?.relationField as string | undefined;
  return (field ? props.data[field] : undefined) ?? props.data[props.column.id];
});
// A number is a count for to-many relations; for manyToOne it is the FK id.
const isCountValue = computed(() => {
  return typeof value.value === 'number' && !isManyToOne.value;
});

const getNestedValue = (value: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((obj, key) => {
    return obj != null && typeof obj === 'object'
      ? (obj as Record<string, unknown>)[key]
      : undefined;
  }, value);
};
const label = computed(() => {
  const val = value.value;
  if (isCountValue.value) {
    if (val === 1) return '1 record';
    else return `${val} records`;
  }

  if (typeof val === 'undefined' || val === null)
    return undefined;
  if (typeof val !== 'object') return String(val);

  const displayKey = ((props.options?.displayKey ?? props.options?.key) ?? 'id') as string;

  return getNestedValue(val, displayKey) as string;
});

const openDetails = () => {
  if (isManyToOne.value)
    return openDetailsManyToOne();
  return openDetailsManyToMany();
};

const config = computedAsync(() => {
  const resource = props.options?.resource;
  if (!resource) return Promise.resolve(null);

  return useCrouton().getFormByUri(resource as string);
});

const openDetailsManyToOne = () => {
  const resource = computed(() => {
    return config.value
      ? useResources(config?.value, {
          readonly: true,
          initialLoad: false,
          defaultUriParams: { parent: props.data as unknown as string },
        })
      : null;
  });
  resource.value?.view(value.value);
};

const openDetailsManyToMany = () => {
  ModalService.openModal({
    component: RelationModal as object,
    props: {
      modalTitle: props.column.label,
      title: 'Related records',
      data: props.data,
      column: props.column,
      options: props.options,
      onClose: (_: unknown) => {
        // No action needed on close
      },
    },
  });
};
</script>
