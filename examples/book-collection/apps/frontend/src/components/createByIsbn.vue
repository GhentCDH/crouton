<template>
  <div class="card max-w-96">
    <div class="card-body">
      <h2 class="card-title">Add a book by ISBN</h2>
      <p v-if="error" class="text-error text-sm">{{ error }}</p>
      <p v-if="success" class="text-success text-sm">{{ success }}</p>
      <p>
        <Input
          v-model="isbn"
          placeholder="ISBN (10 or 13 digits)"
          :disabled="loading"
        />
      </p>
      <div class="justify-end card-actions">
        <button
          class="btn btn-primary"
          :disabled="loading || !isbn.trim()"
          @click="addBook"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm" />
          {{ loading ? 'Searching…' : 'Search and add' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import { Input, useApi } from '@ghentcdh/crouton-vue';

import { createBookFromIsbn } from './searchBookByIsbn';

const props = defineProps({
  resource: {
    type: Object as () => {
      api: { create: (data: unknown) => Promise<unknown> };
      reload: () => void;
    } | null,
    default: null,
  },
});

const api = useApi();
const isbn = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const addBook = async () => {
  error.value = null;
  success.value = null;
  loading.value = true;
  try {
    const mapped = await createBookFromIsbn(isbn.value.trim(), api, (data) =>
      props.resource!.api.create(data),
    );
    isbn.value = '';
    success.value = `"${mapped.book.title}" added.`;
    props.resource?.reload();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.';
  } finally {
    loading.value = false;
  }
};
</script>
