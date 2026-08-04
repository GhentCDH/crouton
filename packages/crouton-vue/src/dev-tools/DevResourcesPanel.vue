<script setup lang="ts">
import { computed, ref } from 'vue';

import { Btn, IconEnum } from '@ghentcdh/ui';

import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import { DevResourcesPanelProperties } from './DevResourcesPanel.properties';

defineProps(DevResourcesPanelProperties);

const crouton = useCrouton();

/** Mirrors DevResourcesController's response shapes — see dev-resources.controller.ts. */
type DbModelSummary = {
  prismaName: string;
  clientAccessor: string;
  hasResource: boolean;
  availableOnClient: boolean;
};

type Decision = {
  id: string;
  kind: string;
  field?: string;
  recommended: string;
  options: string[];
  context?: string;
};

type PlannedResource = {
  resource: string;
  model: string;
  isNew: boolean;
  decisions: Decision[];
  files: { path: string; action: string }[];
  notes: string[];
};

const describeDecision = (d: Decision): string => {
  const target = d.field ? `${d.kind}: ${d.field}` : d.kind;
  const context = d.context ? ` (${d.context})` : '';
  return `${target} → ${d.recommended}${context}`;
};

const errorMessage = (e: unknown): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ??
  (e as Error)?.message ??
  'Something went wrong.';

// ── "Pull schema from database" — prisma db pull + generate ───────────────

const pulling = ref(false);
const pullError = ref<string | null>(null);
const pullResult = ref<{
  restartRequired?: boolean;
  dbPull: { ok: boolean; output: string };
  caseFormat: { ok: boolean; output: string };
  generate: { ok: boolean; output: string };
  zodImportsFixed?: number;
} | null>(null);
const pullDirtyFile = ref<string | null>(null);
/**
 * Sticky across the whole panel (not just the pull section) once a pull has
 * happened this session: models/resources generated below may silently 500
 * ("Model ... not found on the provided PrismaClient") until the backend
 * process actually restarts and re-imports its Prisma client.
 */
const restartRequired = ref(false);

const runPull = async (confirm = false) => {
  pulling.value = true;
  pullError.value = null;
  pullResult.value = null;
  if (confirm) pullDirtyFile.value = null;
  try {
    const res = await useApi().post('/_app/resources/pull', { confirm });
    if (res.data.requiresConfirmation) {
      pullDirtyFile.value = res.data.dirtyFile;
      return;
    }
    pullResult.value = res.data;
    if (res.data.restartRequired) restartRequired.value = true;
    await loadModels();
  } catch (e) {
    pullError.value = errorMessage(e);
  } finally {
    pulling.value = false;
  }
};

const cancelPull = () => {
  pullDirtyFile.value = null;
};

// ── "Generate from database" — one table at a time ────────────────────────

const models = ref<DbModelSummary[]>([]);
const loadingModels = ref(false);
const modelsError = ref<string | null>(null);
const syncingModel = ref<string | null>(null);

const modelsWithoutResource = computed(() =>
  models.value.filter((m) => !m.hasResource),
);

/**
 * True whenever any known model isn't available on the running backend's
 * Prisma client yet — a live, persisted signal (unlike `restartRequired`,
 * which only reflects a pull triggered in this browser session).
 */
const anyModelNeedsRestart = computed(() =>
  models.value.some((m) => !m.availableOnClient),
);

const loadModels = async () => {
  loadingModels.value = true;
  modelsError.value = null;
  try {
    const res = await useApi().get('/_app/resources/models');
    models.value = res.data.models;
  } catch (e) {
    modelsError.value = errorMessage(e);
  } finally {
    loadingModels.value = false;
  }
};

/** Refresh everything that a resource sync can affect: the sidebar (new resource) and any cached table/form layout. */
const refreshAfterSync = async () => {
  crouton.invalidateAllFormDefs();
  await crouton.refreshLayout();
};

const generate = async (model: DbModelSummary) => {
  syncingModel.value = model.clientAccessor;
  modelsError.value = null;
  try {
    await useApi().post('/_app/resources/sync', {
      model: model.clientAccessor,
    });
    await Promise.all([loadModels(), refreshAfterSync()]);
  } catch (e) {
    modelsError.value = errorMessage(e);
  } finally {
    syncingModel.value = null;
  }
};

// ── "Reload from database" — plan then apply, CLI-parity ──────────────────

const planning = ref(false);
const applying = ref(false);
const planError = ref<string | null>(null);
const planResult = ref<PlannedResource[] | null>(null);
const selected = ref<Set<string>>(new Set());

const runPlan = async () => {
  planning.value = true;
  planError.value = null;
  planResult.value = null;
  try {
    const res = await useApi().post('/_app/resources/plan', {});
    planResult.value = res.data.resources;
    selected.value = new Set(
      res.data.resources.map((r: PlannedResource) => r.resource),
    );
  } catch (e) {
    planError.value = errorMessage(e);
  } finally {
    planning.value = false;
  }
};

const toggleSelected = (name: string) => {
  const next = new Set(selected.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  selected.value = next;
};

const applySelected = async () => {
  if (!selected.value.size) return;
  applying.value = true;
  planError.value = null;
  try {
    await useApi().post('/_app/resources/apply', {
      resources: [...selected.value],
    });
    planResult.value = null;
    await Promise.all([loadModels(), refreshAfterSync()]);
  } catch (e) {
    planError.value = errorMessage(e);
  } finally {
    applying.value = false;
  }
};

const dismissPlan = () => {
  planResult.value = null;
};

// Only hit the backend when it has actually confirmed the visual builder is
// enabled — otherwise every call below 403s and the panel just looks broken.
if (crouton.isDev) loadModels();
</script>

<template>
  <div v-if="!crouton.isDev" class="alert alert-warning m-4 text-sm">
    The database sync tools aren't enabled on the connected backend. Set
    <code>CROUTON_SCHEMA_EDITOR=true</code> in its <code>.env</code> file and
    restart it.
  </div>
  <div v-else class="flex flex-col gap-6 p-4">
    <div
      v-if="restartRequired || anyModelNeedsRestart"
      class="alert alert-warning text-sm font-semibold"
    >
      Restart the backend now. Its Prisma client was built at process start and
      won't see newly pulled/changed models until it restarts — using one before
      then throws "Model ... not found on the provided PrismaClient".
    </div>

    <section>
      <h3 class="text-lg font-bold mb-2">Pull schema from database</h3>
      <p class="text-sm opacity-70 mb-2">
        Runs <code>prisma db pull</code> + case-format +
        <code>prisma generate</code> against the live database, refreshing
        <code>schema.prisma</code> and the generated client/Zod types. Needs
        real DB credentials on this backend and overwrites
        <code>schema.prisma</code> (backed up to <code>.bak</code> first).
        Resource files aren't touched here — use the sections below for those,
        once the schema is up to date.
      </p>
      <div v-if="pullError" class="alert alert-error mb-2 text-sm">
        {{ pullError }}
      </div>

      <div v-if="pullDirtyFile" class="alert alert-warning mb-2 text-sm">
        <p>
          <code>{{ pullDirtyFile }}</code> has uncommitted changes —
          <code>db pull</code> will overwrite them (a <code>.bak</code> copy is
          kept). Continue?
        </p>
        <div class="flex gap-2 mt-2">
          <Btn :disabled="pulling" @click="runPull(true)">
            {{ pulling ? 'Pulling…' : 'Overwrite and pull' }}
          </Btn>
          <Btn
            color="secondary"
            :outline="true"
            :disabled="pulling"
            @click="cancelPull"
          >
            Cancel
          </Btn>
        </div>
      </div>
      <Btn v-else :disabled="pulling" @click="runPull()">
        {{ pulling ? 'Pulling…' : 'Pull schema' }}
      </Btn>

      <div v-if="pullResult" class="text-sm mt-2 flex flex-col gap-1">
        <p :class="pullResult.dbPull.ok ? 'text-success' : 'text-error'">
          db pull: {{ pullResult.dbPull.ok ? 'ok' : 'failed' }}
        </p>
        <p :class="pullResult.caseFormat.ok ? 'text-success' : 'text-warning'">
          case-format: {{ pullResult.caseFormat.ok ? 'ok' : 'failed' }}
        </p>
        <p :class="pullResult.generate.ok ? 'text-success' : 'text-warning'">
          generate: {{ pullResult.generate.ok ? 'ok' : 'failed' }}
        </p>
        <p v-if="pullResult.zodImportsFixed" class="opacity-70">
          Patched {{ pullResult.zodImportsFixed }} file(s) with a missing zod
          import.
        </p>
      </div>
    </section>

    <section>
      <h3 class="text-lg font-bold mb-2">Generate from database</h3>
      <p class="text-sm opacity-70 mb-2">
        DB tables that don't have a resource.json yet. Generating uses
        recommended defaults — review the result in the schema editor
        afterwards.
      </p>
      <div v-if="modelsError" class="alert alert-error mb-2 text-sm">
        {{ modelsError }}
      </div>
      <div v-if="loadingModels" class="text-sm opacity-60">Loading…</div>
      <template v-else>
        <p v-if="!modelsWithoutResource.length" class="text-sm opacity-60">
          Every DB table already has a resource.
        </p>
        <ul v-else class="flex flex-col gap-1">
          <li
            v-for="m in modelsWithoutResource"
            :key="m.prismaName"
            class="flex items-center justify-between gap-2"
          >
            <span
              >{{ m.prismaName }}
              <span class="opacity-50">({{ m.clientAccessor }})</span>
              <span
                v-if="!m.availableOnClient"
                class="badge badge-warning badge-sm ml-1"
                title="This model isn't on the running backend's Prisma client yet — generate works, but requests to it will fail until the backend restarts."
              >
                needs restart
              </span>
            </span>
            <Btn
              :icon="IconEnum.Plus"
              :disabled="syncingModel === m.clientAccessor"
              @click="generate(m)"
            >
              {{
                syncingModel === m.clientAccessor ? 'Generating…' : 'Generate'
              }}
            </Btn>
          </li>
        </ul>
      </template>
    </section>

    <section>
      <h3 class="text-lg font-bold mb-2">Reload from database</h3>
      <p class="text-sm opacity-70 mb-2">
        Introspects the current Prisma schema and diffs it against every
        existing resource — the same check <code>crouton update resources</code>
        runs from the CLI, using recommended defaults. Nothing is written until
        you review and confirm.
      </p>
      <div v-if="planError" class="alert alert-error mb-2 text-sm">
        {{ planError }}
      </div>

      <Btn v-if="!planResult" :disabled="planning" @click="runPlan">
        {{ planning ? 'Checking…' : 'Check for changes' }}
      </Btn>

      <template v-else>
        <p v-if="!planResult.length" class="text-sm opacity-60">
          No changes — every resource already matches the current schema.
        </p>
        <template v-else>
          <table class="table w-full mb-2">
            <thead>
              <tr>
                <th />
                <th>Resource</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in planResult" :key="r.resource">
                <td>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="selected.has(r.resource)"
                    @change="toggleSelected(r.resource)"
                  />
                </td>
                <td>
                  {{ r.resource }}
                  <span v-if="r.isNew" class="badge badge-sm ml-1">new</span>
                </td>
                <td class="text-sm">
                  <div v-for="f in r.files" :key="f.path">
                    {{ f.action }} {{ f.path }}
                  </div>
                  <div v-for="d in r.decisions" :key="d.id" class="opacity-70">
                    {{ describeDecision(d) }}
                  </div>
                  <div v-for="(n, i) in r.notes" :key="i" class="opacity-70">
                    {{ n }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="flex gap-2">
            <Btn :disabled="applying || !selected.size" @click="applySelected">
              {{ applying ? 'Applying…' : `Apply ${selected.size} selected` }}
            </Btn>
            <Btn
              color="secondary"
              :outline="true"
              :disabled="applying"
              @click="dismissPlan"
            >
              Cancel
            </Btn>
          </div>
        </template>
      </template>
    </section>
  </div>
</template>
