<script setup lang="ts">
import { ref, watch } from 'vue';
import { z } from 'zod';
import { buildResourceJsonSchema, runResourceMigrations } from '@ghentcdh/crouton-core';

type ValidationState =
  | { status: 'idle' }
  | { status: 'valid'; data: unknown }
  | { status: 'invalid'; message: string };

const EXAMPLES = {
  valid: JSON.stringify(
    {
      name: 'book',
      model: 'Book',
      title: 'Books',
      tag: 'Books',
      columns: {
        title: { label: 'Title', type: 'string' },
        year: { label: 'Year', type: 'number' },
      },
    },
    null,
    2,
  ),
  missingKind: JSON.stringify(
    {
      name: 'article',
      kind: 'custom',
      model: 'Article',
      title: 'Articles',
    },
    null,
    2,
  ),
  missingColumnType: JSON.stringify(
    {
      name: 'note',
      kind: 'custom',
      title: 'Notes',
      columns: {
        body: { label: 'Body' },
      },
    },
    null,
    2,
  ),
};

const input = ref('');
const result = ref<ValidationState>({ status: 'idle' });

let timer: ReturnType<typeof setTimeout> | null = null;

const validate = (raw: string) => {
  if (!raw.trim()) {
    result.value = { status: 'idle' };
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    result.value = { status: 'invalid', message: 'Invalid JSON — cannot parse.' };
    return;
  }
  const migrated = runResourceMigrations(parsed as Record<string, unknown>);
  const outcome = buildResourceJsonSchema().safeParse(migrated);
  if (outcome.success) {
    result.value = { status: 'valid', data: outcome.data };
  } else {
    result.value = { status: 'invalid', message: z.prettifyError(outcome.error) };
  }
};

watch(input, (val) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => validate(val), 200);
});

const loadExample = (key: keyof typeof EXAMPLES) => {
  input.value = EXAMPLES[key];
};
</script>

<template>
  <div class="resource-json-validator">
    <div class="example-buttons">
      <span class="label">Load example:</span>
      <button @click="loadExample('valid')">Valid</button>
      <button @click="loadExample('missingKind')">model on custom resource</button>
      <button @click="loadExample('missingColumnType')">missing column type</button>
    </div>

    <textarea
      v-model="input"
      placeholder="Paste your resource.json here…"
      rows="18"
      spellcheck="false"
    />

    <div v-if="result.status === 'idle'" class="state idle">
      Paste a <code>resource.json</code> above to validate it.
    </div>

    <div v-else-if="result.status === 'valid'" class="state valid">
      <strong>✓ Valid</strong>
      <details>
        <summary>Normalized output</summary>
        <pre>{{ JSON.stringify(result.data, null, 2) }}</pre>
      </details>
    </div>

    <div v-else class="state invalid">
      <strong>✗ Invalid</strong>
      <pre class="errors">{{ result.message }}</pre>
    </div>
  </div>
</template>

<style scoped>
.resource-json-validator {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.example-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.example-buttons .label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.example-buttons button {
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--vp-c-border, #ccc);
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f6f6f7);
  cursor: pointer;
}

.example-buttons button:hover {
  background: var(--vp-c-brand-soft, #e8f4fd);
}

textarea {
  width: 100%;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.85rem;
  padding: 0.75rem;
  border: 1px solid var(--vp-c-border, #ccc);
  border-radius: 6px;
  background: var(--vp-c-bg-soft, #f6f6f7);
  color: var(--vp-c-text-1, inherit);
  resize: vertical;
}

.state {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.state.idle {
  background: var(--vp-c-bg-soft, #f6f6f7);
  opacity: 0.7;
}

.state.valid {
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #166534;
}

.state.invalid {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

pre {
  margin: 0.5rem 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8rem;
}

details summary {
  cursor: pointer;
  margin-top: 0.25rem;
  font-size: 0.85rem;
}
</style>
