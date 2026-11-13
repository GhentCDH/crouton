<template>
  <div class="hero min-h-screen bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md flex flex-col items-center gap-3">
        <img
          v-if="app.logo"
          :src="app.logo"
          :alt="app.title"
          class="w-48 mb-2"
        >
        <h1
          v-if="app.title"
          class="text-3xl font-bold mb-4"
        >
          {{ app.title }}
        </h1>
        <div
          v-if="error"
          role="alert"
          class="alert alert-error"
        >
          {{ t('auth.accessDenied', 'Sign-in failed or this account has no access.') }}
        </div>
        <button
          v-for="(p, i) of providers"
          :key="p.id"
          class="btn btn-lg w-full"
          :class="i === 0 ? 'btn-primary' : 'btn-outline'"
          @click="loginWith(p)"
        >
          <svg
            v-if="p.provider === 'google'"
            class="w-6 h-6"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <svg
            v-else-if="p.provider === 'microsoft'"
            class="w-6 h-6"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#f25022"
              d="M1 1h10v10H1z"
            />
            <path
              fill="#00a4ef"
              d="M1 13h10v10H1z"
            />
            <path
              fill="#7fba00"
              d="M13 1h10v10H13z"
            />
            <path
              fill="#ffb900"
              d="M13 13h10v10H13z"
            />
          </svg>
          {{ t('auth.signInWith', 'Sign in with') }} {{ p.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@crouton/auth-vue';
import { useRoute } from 'vue-router';

import { useLanguage } from '../i18n/useLanguage';

const { t } = useLanguage();
const { providers, app, loginWith } = useAuth();
const error = useRoute().query['error'];
</script>
