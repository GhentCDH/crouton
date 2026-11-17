<script setup lang="ts">
import { ref } from 'vue';
import {
  Alert,
  Autocomplete,
  Btn,
  BtnBadge,
  Card,
  Checkbox,
  Collapse,
  CollapseRow,
  IconEnum,
  Input,
  InputNumber,
  Loading,
  Modal,
  MultiSelect,
  SelectComponent,
  SubMenu,
  Textarea,
} from '@ghentcdh/crouton-ui-vue';
import { DatePicker } from '@ghentcdh/crouton-forms-vue';

const textValue = ref('');
const numberValue = ref(42);
const textareaValue = ref('');
const checkboxValue = ref(false);
const selectValue = ref('');
const multiValue = ref<string[]>(['a']);
const autocompleteValue = ref('');
const modalOpen = ref(false);
const modalSelectValue = ref('');
const modalDateValue = ref<string | undefined>();
const dateValue = ref<string | undefined>('2026-08-14T00:00:00.000Z');
const dateTimeValue = ref<string | undefined>();
const lastAction = ref('—');

const selectOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

const cityOptions = ['Antwerp', 'Bruges', 'Brussels', 'Ghent', 'Leuven', 'Liège', 'Namur'].map(
  (city) => ({ value: city.toLowerCase(), label: city }),
);

const collapseActions = [
  { icon: IconEnum.Edit, tooltip: 'Edit', onClick: () => (lastAction.value = 'Edit') },
  { icon: IconEnum.Delete, tooltip: 'Delete', onClick: () => (lastAction.value = 'Delete') },
];

const userMenu = {
  label: 'Jane Doe',
  items: [
    { label: 'Profile', action: () => (lastAction.value = 'Profile') },
    {
      label: 'Language',
      items: [
        { label: 'English', action: () => (lastAction.value = 'English') },
        { label: 'Nederlands', action: () => (lastAction.value = 'Nederlands') },
      ],
    },
    { label: 'Logout', action: () => (lastAction.value = 'Logout') },
  ],
};
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
          <!-- Icon-only: aria-label gives the name, tooltip shows it on hover/focus -->
          <Btn :icon="IconEnum.Edit" color="secondary" size="xs" tooltip="Edit" aria-label="Edit" />
          <Btn :icon="IconEnum.View" color="secondary" size="xs" tooltip="View" aria-label="View" />
          <Btn :icon="IconEnum.Delete" color="error" size="xs" tooltip="Delete" aria-label="Delete" />
          <Btn color="primary" outline tooltip="Copies the record without its relations">Duplicate</Btn>
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
          <MultiSelect
            v-model="multiValue"
            label="Multi select"
            :options="selectOptions"
            width="w-64"
          />
          <Autocomplete
            v-model="autocompleteValue"
            label="Autocomplete"
            :options="cityOptions"
            placeholder="Type a city…"
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
          <Collapse title="With actions" :opened="true" :actions="collapseActions">
            <CollapseRow title="Item" label="Icon actions in the header" />
          </Collapse>
        </div>
        <p class="text-sm opacity-60 mt-2">Last action: {{ lastAction }}</p>
      </section>

      <!-- Menu -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Menu</h2>
        <!-- popovertarget button + popover list: Esc, outside click and choosing an item close it -->
        <div class="flex items-center gap-4">
          <SubMenu v-bind="userMenu" />
          <span class="text-sm opacity-60">Last action: {{ lastAction }}</span>
        </div>
      </section>

      <!-- Loading -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Loading</h2>
        <Loading :loading="true" />
      </section>

      <!-- Date picker -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Date picker</h2>
        <div class="flex flex-wrap gap-4 items-start">
          <DatePicker v-model="dateValue" label="Date" width="w-64" />
          <DatePicker v-model="dateTimeValue" label="Date + time" :with-time="true" width="w-64" />
          <DatePicker v-model="dateValue" label="Bounded (Aug 2026)" min="2026-08-01" max="2026-08-31" width="w-64" />
          <DatePicker v-model="dateValue" label="Disabled" :enabled="false" width="w-64" />
        </div>
        <p class="text-sm opacity-60 mt-2">Value: {{ dateValue ?? '—' }}</p>
      </section>

      <!-- Modal -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Modal</h2>
        <Btn color="primary" @click="modalOpen = true">Open modal</Btn>
        <Modal modal-title="Example modal" :open="modalOpen" @close-modal="modalOpen = false">
          <template #content>
            <p>Native &lt;dialog&gt;: Esc closes, focus is trapped and returned.</p>
            <p class="text-sm opacity-60">
              The dropdowns below open in the top layer, above the dialog. Esc inside an open
              dropdown closes only the dropdown.
            </p>
            <div class="flex flex-wrap gap-4 items-start mt-2">
              <SelectComponent
                v-model="modalSelectValue"
                label="Select"
                :options="selectOptions"
                width="w-56"
              />
              <DatePicker v-model="modalDateValue" label="Date" width="w-56" />
            </div>
          </template>
          <template #actions>
            <Btn color="secondary" outline @click="modalOpen = false">Cancel</Btn>
            <Btn color="primary" @click="modalOpen = false">Save</Btn>
          </template>
        </Modal>
      </section>

    </div>
  </ClientOnly>
</template>
