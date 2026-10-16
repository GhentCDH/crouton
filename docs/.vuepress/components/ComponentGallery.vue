<script setup lang="ts">
import {
  Alert,
  Btn,
  BtnBadge,
  Card,
  Collapse,
  CollapseRow,
  Icon,
  IconEnum,
  Loading,
} from '@ghentcdh/crouton-ui-vue';
import GalleryFormInputs from './GalleryFormInputs.vue';
import GalleryModalDemo from './GalleryModalDemo.vue';
import GalleryTableDemo from './GalleryTableDemo.vue';

const iconNames = Object.values(IconEnum);
</script>

<template>
  <ClientOnly>
    <div class="component-gallery crouton-app space-y-8 p-4">

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
          <Btn color="primary" size="lg">Large</Btn>
          <Btn color="primary" size="xl">XLarge</Btn>
        </div>

        <h3 class="text-sm font-semibold mt-4 mb-2">With icon</h3>
        <div class="flex flex-wrap gap-2 items-center">
          <Btn :icon="IconEnum.Plus">Create</Btn>
          <Btn :icon="IconEnum.Edit" color="secondary">Edit</Btn>
          <Btn :icon="IconEnum.Delete" color="error">Delete</Btn>
          <Btn :icon="IconEnum.Sync" outline>Refresh</Btn>
          <Btn :icon="IconEnum.Check" color="ghost">Ghost</Btn>
          <Btn :icon="IconEnum.Link" color="blank">Blank</Btn>
          <Btn :icon="IconEnum.Filter" :disabled="true">Disabled</Btn>
        </div>
        <div class="flex flex-wrap gap-2 items-center mt-2">
          <Btn :icon="IconEnum.View" square aria-label="View" tooltip="View" />
          <Btn :icon="IconEnum.Edit" square color="secondary" aria-label="Edit" tooltip="Edit" />
          <Btn :icon="IconEnum.Delete" square color="error" aria-label="Delete" tooltip="Delete" />
          <Btn :icon="IconEnum.Close" square outline aria-label="Close" tooltip="Close" />
          <Btn :icon="IconEnum.Hamburger" square color="ghost" no-border aria-label="Menu" tooltip="Menu" />
        </div>
        <div class="flex flex-wrap gap-2 items-center mt-2">
          <Btn :icon="IconEnum.Plus" size="xs">XSmall</Btn>
          <Btn :icon="IconEnum.Plus" size="sm">Small</Btn>
          <Btn :icon="IconEnum.Plus" size="lg">Large</Btn>
          <Btn :icon="IconEnum.Plus" size="xl">XLarge</Btn>
        </div>

        <h3 class="text-sm font-semibold mt-4 mb-2">Badges</h3>
        <div class="flex flex-wrap gap-2 items-center">
          <BtnBadge>Badge</BtnBadge>
          <BtnBadge :icon="IconEnum.Check">With icon</BtnBadge>
          <BtnBadge :icon="IconEnum.Close" color="secondary">Removable</BtnBadge>
          <BtnBadge :icon="IconEnum.Close" color="error">Error</BtnBadge>
          <BtnBadge color="secondary">Secondary badge</BtnBadge>
          <BtnBadge :icon="IconEnum.Close" size="xs">XSmall</BtnBadge>
          <BtnBadge :icon="IconEnum.Close" size="lg">Large</BtnBadge>
        </div>
      </section>

      <!-- Icons -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Icons</h2>
        <p class="text-sm opacity-70 mb-2">
          Pass an <code>IconEnum</code> value (or a Vue component) as <code>icon</code>.
        </p>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
          <div
            v-for="name in iconNames"
            :key="name"
            class="flex items-center gap-2 border border-base-300 p-2 text-xs"
          >
            <Icon :icon="name" size="sm" />
            <span>{{ name }}</span>
          </div>
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
        <GalleryFormInputs id-prefix="gallery" />
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
            <template #list>
              <CollapseRow title="Item 1" label="Value 1" />
              <CollapseRow title="Item 2" label="Value 2" description="A description" />
            </template>
          </Collapse>
          <Collapse title="Closed by default" :opened="false">
            <template #list>
              <CollapseRow title="Hidden item" label="Revealed on expand" />
            </template>
          </Collapse>
        </div>
      </section>

      <!-- Table -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Table</h2>
        <GalleryTableDemo />
      </section>

      <!-- Modal -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Modal</h2>
        <GalleryModalDemo />
      </section>

      <!-- Loading -->
      <section>
        <h2 class="text-lg font-semibold mb-3 border-b pb-2">Loading</h2>
        <Loading :loading="true" />
      </section>

    </div>
  </ClientOnly>
</template>
