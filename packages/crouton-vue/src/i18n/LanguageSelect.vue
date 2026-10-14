<template>
  <select
    v-if="languages.length > 1"
    class="select select-bordered select-sm w-full"
    :value="language"
    @change="setLanguage(($event.target as HTMLSelectElement).value)"
  >
    <option v-for="lang in languages" :key="lang" :value="lang">
      {{ displayName(lang) }}
    </option>
  </select>
</template>
<script setup lang="ts">
import { LanguageSelectProperties } from './LanguageSelect.properties';
import { useLanguage } from '../composables/useLanguage';

defineProps(LanguageSelectProperties);

const { language, languages, setLanguage } = useLanguage();

const displayName = (lang: string): string => {
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang.toUpperCase();
  } catch {
    return lang.toUpperCase();
  }
};
</script>
