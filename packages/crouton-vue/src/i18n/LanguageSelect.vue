<template>
  <div v-if="languages.length > 1" class="tooltip tooltip-top" data-tip="Language">
    <div class="dropdown dropdown-top">
      <div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-1">
        <LanguageIcon class="size-4" />
        <span>{{ displayName(language) }}</span>
        <ChevronDownIcon class="size-3 opacity-60" />
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu menu-sm bg-base-100 rounded-box border border-base-300 z-10 mb-1 w-36 p-1 shadow"
      >
        <li v-for="lang in languages" :key="lang">
          <a :class="{ active: lang === language }" @click="setLanguage(lang)">
            {{ displayName(lang) }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
<script setup lang="ts">
import { LanguageIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import { LanguageSelectProperties } from './LanguageSelect.properties';
import { useLanguage } from '../composables/useLanguage';

defineProps(LanguageSelectProperties);

const { language, languages, setLanguage } = useLanguage();

const displayName = (lang: string): string => {
  if(lang ==='wv') return 'West Vloams';
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang.toUpperCase();
  } catch {
    return lang.toUpperCase();
  }
};
</script>
