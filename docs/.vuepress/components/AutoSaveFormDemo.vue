<script setup lang="ts">
import { ref } from 'vue';
import CroutonForm from '../../../packages/crouton-vue/src/forms/CroutonForm.vue';
import axios from 'axios';

const api = axios;

const resource = ref({
  name: 'book',
  route: 'books',
  model: 'Book',
  tag: 'Books',
  title: 'Books',
  display: { mode: 'modal', customComponent: null },
  modalSize: 'sm',
  sidebar: { hide: false },
  operations: {
    findAll: true,
    findOne: true,
    create: true,
    update: true,
    patch: true,
    delete: true,
  },
  columns: {
    title: { label: 'Title', column: 'title' },
    author: { label: 'Author', column: 'author' },
    year: { label: 'Year', column: 'year' },
    published: {
      label: 'Published',
      column: 'published',
      hiddenInTable: true,
    },
  },
});

const dataSchema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
      title: 'Label',
      minLength: 1,
    },
    date: {
      type: 'string',
      title: 'Date',
      minLength: 1,
    },
    amount: {
      type: 'number',
      title: 'Amount',
    },
  },
  additionalProperties: true,
  required: ['label', 'date', 'amount', 'paid_by'],
};
const uiSchema = {
  type: 'GridLayout',
  elements: [
    {
      type: 'Control',
      scope: '#/properties/label',
      options: {
        format: 'text',
        styles: {
          width: 'full',
          control: {
            wrapper: 'input-full',
          },
        },
        colspan: 12,
        label: 'Label',
      },
    },
    {
      type: 'Control',
      scope: '#/properties/date',
      options: {
        format: 'date',
        styles: {
          width: 'full',
          control: {
            wrapper: 'input-full',
          },
        },
        colspan: 6,
      },
    },
    {
      type: 'Control',
      scope: '#/properties/amount',
      options: {
        format: 'number',
        styles: {
          width: 'full',
          control: {
            wrapper: 'input-full',
          },
        },
        colspan: 6,
        label: 'Amount',
      },
    },
  ],
};

const lastEmitted = ref('');

const onUpdate = (value: unknown) => {
  resource.value = value as typeof resource.value;
  lastEmitted.value = new Date().toLocaleTimeString();
};
</script>

<template>
  <div class="border border-base-300 rounded-lg p-4">
    <CroutonForm
      :schema="dataSchema"
      :ui-schema="uiSchema"
      :model-value="resource"
      :http="api"
      title="Demo form"
      @update:model-value="onUpdate"
    />
  </div>
  <h2>Validate on mount</h2>
  <div class="border border-base-300 rounded-lg p-4">
    <CroutonForm
      :schema="dataSchema"
      :ui-schema="uiSchema"
      :model-value="resource"
      :http="api"
      :validate-on-mount="true"
      title="Demo form"
      @update:model-value="onUpdate"
    />
  </div>
</template>