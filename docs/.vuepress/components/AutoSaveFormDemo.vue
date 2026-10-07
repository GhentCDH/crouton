<script setup lang="ts">
import { ref } from 'vue';
import CroutonForm from '../../../packages/crouton-vue/src/forms/CroutonForm.vue';
import axios from 'axios';

const api = axios;

const formData = ref({
  label: '',
  date: '',
  amount: 0,
});

const views = {
  form: {
    json_schema: {
      type: 'object',
      properties: {
        label: { type: 'string', title: 'Label', minLength: 1 },
        date:  { type: 'string', title: 'Date',  minLength: 1 },
        amount: { type: 'number', title: 'Amount' },
      },
      required: ['label', 'date', 'amount'],
      additionalProperties: true,
    },
    ui_schema: {
      type: 'GridLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/label',
          options: { format: 'text', colspan: 12, label: 'Label' },
        },
        {
          type: 'Control',
          scope: '#/properties/date',
          options: { format: 'date', colspan: 6 },
        },
        {
          type: 'Control',
          scope: '#/properties/amount',
          options: { format: 'number', colspan: 6, label: 'Amount' },
        },
      ],
    },
    columns: [],
  },
};

const onSave = (data: unknown) => {
  console.log('saved', data);
};
</script>

<template>
  <div class="border border-base-300 rounded-lg p-4">
    <CroutonForm
      :views="views"
      :data="formData"
      :http="api"
      title="Demo form"
      @save="onSave"
    />
  </div>
  <h2>Validate on mount</h2>
  <div class="border border-base-300 rounded-lg p-4">
    <CroutonForm
      :views="views"
      :data="formData"
      :http="api"
      :validate-on-mount="true"
      title="Demo form (validate on mount)"
      @save="onSave"
    />
  </div>
</template>
