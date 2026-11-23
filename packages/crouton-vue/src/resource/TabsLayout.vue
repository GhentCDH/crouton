<script setup lang="ts">
import type { UISchemaElement } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Dispatch, scopeToPath } from '@ghentcdh/crouton-forms-vue';

import { useLanguage } from '../i18n/useLanguage';
import { TabsLayoutProperties } from './TabsLayout.properties';

const props = defineProps(TabsLayoutProperties);
const { t } = useLanguage();
const form = useFormContext();
const uid = useId();

type El = UISchemaElement & { scope?: string; elements?: El[]; label?: string };
const els = computed(() => props.elements as El[]);

const titleOf = (el: El, i: number): string => {
  const o = (el.options ?? {}) as { title?: string; titleKey?: string };
  const fromData = o.titleKey ? props.data?.[o.titleKey] : undefined;
  return (fromData != null && fromData !== '' ? String(fromData) : undefined)
    ?? o.title ?? el.label ?? `${t('layout.tab', 'Tab')} ${i + 1}`;
};

// ── active tab (optionally mirrored in the route query) ──────────────────────
const route = props.syncQuery ? useRoute() : undefined;
const router = props.syncQuery ? useRouter() : undefined;
const fromQuery = (): number => {
  const n = Number(route?.query[props.syncQuery ?? '']);
  return Number.isInteger(n) && n >= 1 && n <= els.value.length ? n - 1 : 0;
};
const active = ref(fromQuery());
watch(() => route?.query[props.syncQuery ?? ''], () => (active.value = fromQuery()));
watch(active, (i) => {
  if (!router || !route || !props.syncQuery) return;
  void router.replace({ query: { ...route.query, [props.syncQuery]: String(i + 1) } });
});

// ── error badge: any field scope in the tab's subtree has a validation error ──
// ponytail: matches on form-level paths; fields inside array items (pathPrefix) are not mapped to their tab.
const pathsOf = (el: El): string[] => [
  ...(el.scope ? [scopeToPath(el.scope)] : []),
  ...(el.elements ?? []).flatMap(pathsOf),
];
const tabPaths = computed(() => els.value.map(pathsOf));
const hasErrors = (i: number): boolean => {
  const keys = Object.keys(form?.errors.value ?? {});
  return (tabPaths.value[i] ?? []).some((p) =>
    keys.some((k) => k === p || k.startsWith(`${p}.`) || k.startsWith(`${p}[`)),
  );
};

// ── keyboard: arrows / Home / End move between tabs (WAI-ARIA tabs pattern) ──
const tabRefs = useTemplateRef<HTMLButtonElement[]>('tabs');
const onKey = (e: KeyboardEvent) => {
  const n = els.value.length;
  const next = { ArrowRight: active.value + 1, ArrowLeft: active.value - 1, Home: 0, End: n - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  active.value = (next + n) % n;
  void nextTick(() => tabRefs.value?.[active.value]?.focus());
};
</script>

<template>
  <div class="flex flex-col gap-3">
    <div role="tablist" class="tabs tabs-border" @keydown="onKey">
      <button
        v-for="(el, i) in els"
        :id="`tab-${uid}-${i}`"
        ref="tabs"
        :key="i"
        type="button"
        role="tab"
        :aria-selected="active === i"
        :aria-controls="`tabpanel-${uid}-${i}`"
        :tabindex="active === i ? 0 : -1"
        :class="['tab gap-1', { 'tab-active': active === i, 'text-error': hasErrors(i) }]"
        @click="active = i"
      >
        {{ titleOf(el, i) }}
        <span
          v-if="hasErrors(i)"
          class="badge badge-error badge-xs"
          :aria-label="t('layout.tabHasErrors', 'Contains errors')"
          :title="t('layout.tabHasErrors', 'Contains errors')"
        >!</span>
      </button>
    </div>
    <!-- v-show, not v-if: inactive tabs stay mounted so their fields keep validating -->
    <div
      v-for="(el, i) in els"
      v-show="active === i"
      :id="`tabpanel-${uid}-${i}`"
      :key="i"
      role="tabpanel"
      :aria-labelledby="`tab-${uid}-${i}`"
    >
      <Dispatch :uischema="el" :schema="schema" />
    </div>
  </div>
</template>
