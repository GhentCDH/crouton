<script setup lang="ts">
import { ref } from 'vue';
import {
  Alert,
  Btn,
  BtnBadge,
  Card,
  Checkbox,
  Collapse,
  CollapseRow,
  Input,
  InputNumber,
  Loading,
  SelectComponent,
  Textarea,
} from '@ghentcdh/crouton-ui-vue';

const textValue = ref('');
const numberValue = ref(42);
const textareaValue = ref('');
const checkboxValue = ref(false);
const selectValue = ref('');

const selectOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];
</script>

<template>
  <ClientOnly>
    <div class="component-gallery space-y-8 p-4">

      <!-- Buttons -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Buttons</h2>
        <div class="flex flex-wrap gap-2 items-center">
          <Btn>Default</Btn>
          <Btn color="primary">Primary</Btn>
          <Btn color="secondary">Secondary</Btn>
          <Btn color="error">Error</Btn>
          <Btn color="primary" outline>Outline</Btn>
          <Btn color="primary" :disabled="true">Disabled</Btn>
          <Btn color="primary" size="xs">XSmall</Btn>
          <Btn color="primary" size="sm">Small</Btn>
          <Btn color="primary" size="md">Medium</Btn>
        </div>
        <div class="flex flex-wrap gap-2 items-center mt-2">
          <BtnBadge>Badge</BtnBadge>
          <BtnBadge icon="mdi:star">With icon</BtnBadge>
          <BtnBadge color="secondary">Secondary badge</BtnBadge>
        </div>
      </section>

      <!-- Alerts -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Alerts</h2>
        <div class="space-y-2">
          <Alert type="info" message="This is an info message." />
          <Alert type="success" message="Operation completed successfully." />
          <Alert type="warning" message="Proceed with caution." />
          <Alert type="error" message="Something went wrong." />
        </div>
      </section>

      <!-- Form Inputs -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Form Inputs</h2>
        <div class="flex flex-wrap gap-4 items-start">
          <Input v-model="textValue" label="Text input" placeholder="Type something…" width="w-64" />
          <Input v-model="textValue" label="Clearable" placeholder="Type to clear…" :clearable="true" width="w-64" />
          <Input v-model="textValue" label="Disabled" placeholder="Disabled" :enabled="false" width="w-64" />
          <Input v-model="textValue" label="With error" errors="This field is required" :is-touched="true" width="w-64" />
          <InputNumber v-model="numberValue" label="Number" width="w-48" />
          <Textarea v-model="textareaValue" label="Textarea" placeholder="Enter text…" width="w-64" />
          <Checkbox v-model="checkboxValue" label="Checkbox" />
          <SelectComponent
            v-model="selectValue"
            label="Select"
            :options="selectOptions"
            value-key="value"
            label-key="label"
            width="w-64"
          />
        </div>
      </section>

      <!-- Card -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Card</h2>
        <div class="flex gap-4 flex-wrap">
          <Card class="w-64">
            <template #title>Card title</template>
            Card body content goes here.
            <template #actions>
              <Btn color="primary" size="sm">Action</Btn>
            </template>
          </Card>
          <Card class="w-64">
            <template #title>Simple card</template>
            No actions, just content.
          </Card>
        </div>
      </section>

      <!-- Collapse -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Collapse</h2>
        <div class="space-y-2 max-w-xl">
          <Collapse title="Open by default" :opened="true">
            <CollapseRow title="Item 1" label="Value 1" />
            <CollapseRow title="Item 2" label="Value 2" description="A description" />
          </Collapse>
          <Collapse title="Closed by default" :opened="false">
            <CollapseRow title="Hidden item" label="Revealed on expand" />
          </Collapse>
        </div>
      </section>

      <!-- Loading -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Loading</h2>
        <Loading :loading="true" />
      </section>

    </div>
  </ClientOnly>
</template>
