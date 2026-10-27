<template>
  <div v-if="languages.length > 1" class="flex items-center gap-1 px-2">
    <LanguageIcon class="size-4 shrink-0 text-base-content/60" />
    <select
      class="select select-ghost select-sm w-full"
      :value="language"
      @change="setLanguage(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="lang in languages" :key="lang" :value="lang">
        {{ displayName(lang) }}
      </option>
    </select>
  </div>
</template>
<script setup lang="ts">
import { LanguageIcon } from '@heroicons/vue/24/outline';
import { LanguageSelectProperties } from './LanguageSelect.properties';
import { useLanguage } from './useLanguage';

defineProps(LanguageSelectProperties);

const { language, languages, setLanguage } = useLanguage();

const displayName = (lang: string): string => {
  if (lang === 'wv') return 'West Vloams';
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang.toUpperCase();
  } catch {
    return lang.toUpperCase();
  }
};
</script>
