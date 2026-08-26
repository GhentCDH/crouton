<template>
  <div class="max-w-3xl mx-auto p-6 space-y-6">
    <h1 class="text-2xl font-bold">Crouton Status</h1>

    <!-- Backend connectivity -->
    <div
      class="rounded-lg border p-4"
      :class="backendUp ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'"
    >
      <div class="flex items-center gap-2">
        <span
          class="inline-block w-3 h-3 rounded-full"
          :class="backendUp ? 'bg-green-500' : 'bg-red-500'"
        />
        <span class="font-semibold">
          Backend: {{ backendUp ? 'Running' : 'Down' }}
        </span>
      </div>
      <p v-if="fetchError" class="mt-1 text-sm text-red-700">
        {{ fetchError }}
      </p>
    </div>

    <!-- Summary banner -->
    <div
      v-if="status"
      class="rounded-lg border p-4"
      :class="status.summary.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'"
    >
      <span v-if="status.summary.ok" class="font-semibold text-green-800">
        All systems operational
      </span>
      <span v-else class="font-semibold text-red-800">
        {{ totalErrors }} issue(s) detected
        <span v-if="status.summary.databaseErrors" class="font-normal">
          &mdash; {{ status.summary.databaseErrors }} database
        </span>
        <span v-if="status.summary.resourceErrors" class="font-normal">
          &mdash; {{ status.summary.resourceErrors }} resource
        </span>
      </span>
    </div>

    <!-- Version + environment badges -->
    <div v-if="status" class="flex gap-2 flex-wrap">
      <span class="rounded bg-gray-100 px-2 py-1 text-sm font-mono">
        app v{{ status.version }}
      </span>
      <span class="rounded bg-gray-100 px-2 py-1 text-sm font-mono">
        crouton v{{ status.croutonVersion }}
      </span>
      <span class="rounded bg-gray-100 px-2 py-1 text-sm font-mono">
        {{ status.environment }}
      </span>
    </div>

    <!-- Databases -->
    <section v-if="status">
      <h2 class="text-lg font-semibold mb-2">Databases</h2>
      <ul class="space-y-1">
        <li
          v-for="db in status.databases"
          :key="db.name"
          class="flex items-start gap-2"
        >
          <span
            class="inline-block w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
            :class="db.connected ? 'bg-green-500' : 'bg-red-500'"
          />
          <div>
            <span class="font-medium">{{ db.name }}</span>
            <p v-if="db.error" class="text-sm text-red-600">{{ db.error }}</p>
          </div>
        </li>
      </ul>
      <p
        v-if="status.databases.length === 0"
        class="text-sm text-gray-500"
      >
        No databases configured.
      </p>
    </section>

    <!-- Resources -->
    <section v-if="status">
      <h2 class="text-lg font-semibold mb-2">Resources</h2>
      <ul class="space-y-1">
        <li
          v-for="res in status.resources"
          :key="res.name"
          class="flex items-start gap-2"
        >
          <span
            class="inline-block w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
            :class="res.draft ? 'bg-gray-400' : res.valid ? 'bg-green-500' : 'bg-red-500'"
          />
          <div>
            <span class="font-medium">{{ res.name }}</span>
            <span class="text-sm text-gray-500 ml-1">({{ res.path }})</span>
            <span
              v-if="res.version != null"
              class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono"
            >
              v{{ res.version }}
            </span>
            <span
              v-if="res.draft"
              class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600"
            >
              draft — not loaded
            </span>
            <span
              v-if="res.hidden"
              class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700"
            >
              hidden
            </span>
            <!-- Config-only resource: data comes from its own repository.ts. -->
            <span
              v-if="res.kind === 'custom'"
              class="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700"
              :title="
                res.customOperations?.length
                  ? `repository.ts implements: ${res.customOperations.join(', ')}`
                  : 'No repository.ts loaded'
              "
            >
              custom<span v-if="res.customOperations?.length">
                — {{ res.customOperations.length }} ops</span
              >
            </span>
            <button
              v-if="isDev && res.draft"
              class="ml-2 rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600"
              :disabled="actionLoading === res.name"
              @click="publishResource(res.name)"
            >
              {{ actionLoading === res.name ? '...' : 'Publish' }}
            </button>
            <button
              v-if="isDev && (res.hidden || res.draft)"
              class="ml-1 rounded bg-green-500 px-2 py-0.5 text-xs text-white hover:bg-green-600"
              :disabled="actionLoading === res.name"
              @click="addToMenu(res.name)"
            >
              {{ actionLoading === res.name ? '...' : 'Add to menu' }}
            </button>
            <button
              v-if="isDev && res.valid && !res.draft && !res.hidden"
              class="ml-1 rounded bg-gray-400 px-2 py-0.5 text-xs text-white hover:bg-gray-500"
              :disabled="actionLoading === res.name"
              @click="removeFromMenu(res.name)"
            >
              {{ actionLoading === res.name ? '...' : 'Remove from menu' }}
            </button>
            <!-- Out-of-date file that just needs migration: amber, distinct from a hard error. -->
            <p
              v-if="res.expectedVersion != null && res.expectedVersion !== res.version"
              class="text-sm text-amber-600"
            >
              needs migration to v{{ res.expectedVersion }}<span v-if="res.error"> — {{ res.error }}</span>
            </p>
            <p v-else-if="res.error" class="text-sm text-red-600">
              {{ res.error }}
            </p>
          </div>
        </li>
      </ul>
      <p
        v-if="status.resources.length === 0"
        class="text-sm text-gray-500"
      >
        No resources loaded.
      </p>
    </section>

    <!-- Enums -->
    <StatusEnumsSection v-if="status" :enums="status.enums" />

    <!-- i18n / Translations -->
    <section v-if="status?.i18n">
      <h2 class="text-lg font-semibold mb-2">Translations</h2>
      <div class="rounded-lg border p-4 border-gray-200 bg-gray-50 space-y-2">
        <div class="flex items-center gap-2 text-sm">
          <span
            class="inline-block w-2.5 h-2.5 rounded-full"
            :class="status.i18n.active ? 'bg-green-500' : 'bg-gray-400'"
          />
          <span class="font-medium">{{ status.i18n.active ? 'Active' : 'Inactive' }}</span>
          <span class="text-gray-500">
            &mdash; default: {{ status.i18n.defaultLanguage }}
          </span>
        </div>
        <ul class="space-y-1 mt-2">
          <li
            v-for="b in status.i18n.bundles"
            :key="b.language"
            class="flex items-center gap-2 text-sm"
          >
            <span class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
              {{ b.language }}
            </span>
            <span>{{ b.keyCount }} keys</span>
            <span
              v-if="b.emptyKeys > 0"
              class="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700"
            >
              {{ b.emptyKeys }} untranslated
            </span>
            <span
              v-else
              class="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700"
            >
              complete
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Loading state -->
    <div v-if="loading" class="text-gray-500">Loading status...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import type { CroutonStatus } from './status.types';
import StatusEnumsSection from './StatusEnumsSection.vue';

const status = ref<CroutonStatus | null>(null);
const loading = ref(true);
const backendUp = ref(false);
const fetchError = ref<string | null>(null);
const actionLoading = ref<string | null>(null);

const app = useCrouton();
const isDev = computed(() => app.isDev.value);

const totalErrors = computed(() => {
  if (!status.value) return 0;
  return (
    status.value.summary.databaseErrors + status.value.summary.resourceErrors
  );
});

const fetchStatus = async () => {
  const api = useApi();
  const response = await api.get('/crouton/status.json');
  status.value = response.data;
  backendUp.value = true;
};

const publishResource = async (name: string) => {
  actionLoading.value = name;
  try {
    const api = useApi();
    await api.post(`/_app/resources/${encodeURIComponent(name)}/publish`);
    await fetchStatus();
  } catch (err) {
    console.error('Publish failed', err);
  } finally {
    actionLoading.value = null;
  }
};

const removeFromMenu = async (name: string) => {
  actionLoading.value = name;
  try {
    const api = useApi();
    await api.post(
      `/_app/resources/${encodeURIComponent(name)}/remove-from-menu`,
    );
    await fetchStatus();
    await app.refreshLayout();
  } catch (err) {
    console.error('Remove from menu failed', err);
  } finally {
    actionLoading.value = null;
  }
};

const addToMenu = async (name: string) => {
  actionLoading.value = name;
  try {
    const api = useApi();
    await api.post(`/_app/resources/${encodeURIComponent(name)}/add-to-menu`);
    await fetchStatus();
    await app.refreshLayout();
  } catch (err) {
    console.error('Add to menu failed', err);
  } finally {
    actionLoading.value = null;
  }
};

onMounted(async () => {
  try {
    await fetchStatus();
  } catch (err) {
    backendUp.value = false;
    fetchError.value = (err as Error).message ?? 'Could not reach backend';
  } finally {
    loading.value = false;
  }
});
</script>
