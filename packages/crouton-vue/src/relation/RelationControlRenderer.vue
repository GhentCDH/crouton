<template>
  <ControlLabel v-bind="wrapper" v-if="message">
    <div class="text-sm text-gray-500 italic py-2">
      {{ message }}
    </div>
  </ControlLabel>
  <div v-else-if="isInline">
    <template v-if="displayAs == 'autocomplete' && resource">
      <RelationAutocomplete
        :label-key="appliedOptions.labelKey"
        :label="wrapper.label"
        :value-key="appliedOptions.valueKey"
        :value="value"
        :options="options"
        v-bind="operations"
        @change="onAutocompleteChange"
      />
    </template>
    <div v-else>Configure autocomplete</div>
  </div>
  <RelationInline
    v-else-if="displayAs == 'autocomplete' && resource"
    :form-def-key="wrapper.id"
    :label-key="appliedOptions.labelKey"
    :label="wrapper.label"
    :value-key="appliedOptions.valueKey"
    :values="value"
    :options="options"
    v-bind="operations"
  />
  <ControlLabel v-bind="wrapper" v-else>
    <div v-if="resource">
      <div
        class="flex flex-wrap gap-2 mb-2"
        :class="{
          'flex-col': appliedOptions.direction === 'column',
          'flex-row': appliedOptions.direction === 'row',
        }"
      >
        <RelationButton
          v-for="v of value"
          :key="v"
          :options="appliedOptions"
          :value="v"
          v-bind="operations"
        />
      </div>
      <div>
        <Btn
          v-if="resource.operations?.create"
          icon="Plus"
          size="xs"
          @click="resource.create()"
        >
          Add
        </Btn>
      </div>
    </div>
  </ControlLabel>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { Btn } from '@ghentcdh/ui';
import { computed } from 'vue';
import { useRelationBinding } from './useRelationBinding';
import RelationButton from './RelationButton.vue';
import { ControlLabel, useFormEvents } from '@ghentcdh/crouton-forms-vue';
import RelationInline from './RelationInline.vue';
import RelationAutocomplete from './RelationAutocomplete.vue';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  value,
  field,
  wrapper,
  message: _message,
  resource,
  isNew,
  isInline,
  appliedOptions,
} = useRelationBinding(props.uischema, props.schema, false);

const options = computed(() => {
  const ops = appliedOptions.value;
  return { ...ops, resource: ops.autocompleteResource ?? ops.resource };
});

const message = computed(() => {
  if (isNew.value)
    return `Create first the main object to manage the relations.`;
  return _message;
});

const formEvents = useFormEvents();
const operations = computed(() => {
  const res = resource.value!;
  const ops: Record<string, (value: unknown) => void> = {
    onView: (value: unknown) => {
      res.view(value);
    },
  };
  if (resource.value?.operations.create)
    ops['onCreate'] = (value) => {
      const data = { value };
      res.api.create(data).then((response) => {
        formEvents.dispatch({
          event: 'update-relation',
          type: 'text_metadata',
          data,
        });
      });
    };
  if (resource.value?.operations.update) ops['onEdit'] = res.edit;
  if (resource.value?.operations.delete) ops['onDelete'] = res.delete;
  return ops;
});

const onAutocompleteChange = (selected: unknown) => {
  field.setValue(selected);
  field.setTouched(true);
};

const displayAs = computed(() => {
  if (appliedOptions.value.display === 'autocomplete') return 'autocomplete';

  return null;
});
</script>
