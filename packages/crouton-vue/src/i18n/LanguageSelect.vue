<template>
  <select
    v-if="languages.length > 1"
    :value="language"
    class="select select-sm select-bordered w-full"
    @change="onChange"
  >
    <option v-for="lang in languages" :key="lang" :value="lang">
      {{ lang.toUpperCase() }}
    </option>
  </select>
</template>
<script setup lang="ts">
import { LanguageSelectProperties } from './LanguageSelect.properties';
import { useLanguage } from '../composables/useLanguage';

defineProps(LanguageSelectProperties);

const { language, languages, setLanguage } = useLanguage();

const onChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  setLanguage(target.value);
};
</script>
