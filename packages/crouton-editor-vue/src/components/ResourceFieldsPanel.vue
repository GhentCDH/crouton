<script setup lang="ts">
import { computed, ref } from 'vue';

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';
import { Checkbox, Input, SelectComponent } from '@ghentcdh/ui';

import { ResourceFieldsPanelProperties } from './ResourceFieldsPanel.properties';

const props = defineProps(ResourceFieldsPanelProperties);

const emits = defineEmits<{
  'update:modelValue': [value: ResourceJsonInput];
}>();

const showAdvanced = ref(false);

const update = <K extends keyof ResourceJsonInput>(
  key: K,
  value: ResourceJsonInput[K],
) => {
  emits('update:modelValue', { ...props.modelValue, [key]: value });
};

const updateNested = (
  parent: 'sidebar' | 'display' | 'operations',
  key: string,
  value: unknown,
) => {
  const current = (props.modelValue[parent] ?? {}) as Record<string, unknown>;
  emits('update:modelValue', {
    ...props.modelValue,
    [parent]: { ...current, [key]: value },
  });
};

const displayMode = computed(
  () =>
    (props.modelValue.display as Record<string, unknown> | undefined)?.mode as
      | string
      | undefined,
);

const displayCustomComponent = computed(
  () =>
    (props.modelValue.display as Record<string, unknown> | undefined)
      ?.customComponent as string | null | undefined,
);

const sidebar = computed(
  () => (props.modelValue.sidebar ?? {}) as Record<string, unknown>,
);

const operations = computed(
  () => (props.modelValue.operations ?? {}) as Record<string, unknown>,
);

const displayModeOptions = [
  { label: 'Modal', value: 'modal' },
  { label: 'Page', value: 'page' },
];

const modalSizeOptions = [
  { label: 'Extra small', value: 'xs' },
  { label: 'Small', value: 'sm' },
  { label: 'Large', value: 'lg' },
  { label: 'Extra large', value: 'xl' },
];

const operationKeys = [
  'findAll',
  'findOne',
  'create',
  'update',
  'patch',
  'delete',
] as const;
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Display settings row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <label class="form-control">
        <span class="label-text text-xs">Title</span>
        <Input
          :model-value="modelValue.title ?? ''"
          size="sm"
          placeholder="Display title"
          @update:model-value="update('title', $event || undefined)"
        />
      </label>

      <label class="form-control">
        <span class="label-text text-xs">Display mode</span>
        <SelectComponent
          size="sm"
          :value="displayMode ?? 'modal'"
          :options="displayModeOptions"
          :clearable="false"
          @change="(opt) => updateNested('display', 'mode', opt.value)"
        />
      </label>

      <label class="form-control">
        <span class="label-text text-xs">Modal size</span>
        <SelectComponent
          size="sm"
          :value="modelValue.modalSize ?? 'sm'"
          :options="modalSizeOptions"
          :clearable="false"
          @change="(opt) => update('modalSize', opt.value)"
        />
      </label>

      <label class="form-control">
        <span class="label-text text-xs">Custom component</span>
        <Input
          :model-value="displayCustomComponent ?? ''"
          size="sm"
          placeholder="e.g. MyCustomView"
          @update:model-value="
            updateNested('display', 'customComponent', $event || null)
          "
        />
      </label>
    </div>

    <!-- Sidebar + Operations side by side -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Sidebar -->
      <fieldset class="border border-base-300 rounded-lg p-3">
        <legend class="text-xs font-semibold px-1">Sidebar</legend>
        <div class="grid grid-cols-2 gap-3">
          <label class="form-control flex-row items-center gap-2">
            <Checkbox
              :model-value="!!sidebar.hide"
              @update:model-value="updateNested('sidebar', 'hide', $event)"
            />
            <span class="label-text text-xs">Hide</span>
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Position</span>
            <Input
              :model-value="String(sidebar.position ?? '')"
              size="sm"
              type="number"
              placeholder="Auto"
              @update:model-value="
                updateNested(
                  'sidebar',
                  'position',
                  $event ? Number($event) : undefined,
                )
              "
            />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Label</span>
            <Input
              :model-value="(sidebar.label as string) ?? ''"
              size="sm"
              placeholder="Sidebar label"
              @update:model-value="
                updateNested('sidebar', 'label', $event || undefined)
              "
            />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Group</span>
            <Input
              :model-value="(sidebar.group as string) ?? ''"
              size="sm"
              placeholder="Group slug"
              @update:model-value="
                updateNested('sidebar', 'group', $event || undefined)
              "
            />
          </label>
        </div>
      </fieldset>

      <!-- Operations -->
      <fieldset class="border border-base-300 rounded-lg p-3">
        <legend class="text-xs font-semibold px-1">Operations</legend>
        <div class="grid grid-cols-3 gap-2">
          <label
            v-for="op in operationKeys"
            :key="op"
            class="flex items-center gap-1.5"
          >
            <Checkbox
              :model-value="operations[op] !== false"
              @update:model-value="updateNested('operations', op, $event)"
            />
            <span class="label-text text-xs">{{ op }}</span>
          </label>
        </div>
      </fieldset>
    </div>

    <!-- Advanced / structural fields -->
    <fieldset class="border border-base-300 rounded-lg p-3">
      <legend class="text-xs font-semibold px-1">
        <button
          class="hover:opacity-100 flex items-center gap-1"
          @click="showAdvanced = !showAdvanced"
        >
          <span class="text-xs">{{ showAdvanced ? '▼' : '▶' }}</span>
          Advanced (structural)
        </button>
      </legend>

      <template v-if="showAdvanced">
        <p class="text-xs text-warning mb-3">
          Changing these fields affects generated endpoints and database
          bindings. Update any hardcoded references after saving.
        </p>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label class="form-control">
            <span class="label-text text-xs">Name (id)</span>
            <Input :model-value="modelValue.name" size="sm" disabled />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Route</span>
            <Input
              :model-value="modelValue.route"
              size="sm"
              @update:model-value="update('route', $event)"
            />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Model (Prisma)</span>
            <Input
              :model-value="modelValue.model"
              size="sm"
              @update:model-value="update('model', $event)"
            />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Tag (OpenAPI)</span>
            <Input
              :model-value="modelValue.tag"
              size="sm"
              @update:model-value="update('tag', $event)"
            />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Table</span>
            <Input
              :model-value="modelValue.table ?? ''"
              size="sm"
              placeholder="Defaults to model"
              @update:model-value="update('table', $event || undefined)"
            />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Database</span>
            <Input
              :model-value="modelValue.database ?? ''"
              size="sm"
              placeholder="Default datasource"
              @update:model-value="update('database', $event || undefined)"
            />
          </label>
        </div>
      </template>
      <p v-else class="text-xs opacity-50">
        Name, route, model, tag, table, database
      </p>
    </fieldset>
  </div>
</template>
