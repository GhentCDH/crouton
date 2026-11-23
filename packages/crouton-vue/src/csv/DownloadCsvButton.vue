<template>
  <Btn
    data-testid="btn-download-csv"
    :icon="IconEnum.Download"
    color="secondary"
    :outline="true"
    :loading="loading"
    :disabled="loading"
    @click="download"
  >
    <span class="whitespace-nowrap">{{ t('table.downloadCsv', 'Download CSV') }}</span>
  </Btn>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Btn, IconEnum } from '@ghentcdh/crouton-ui-vue';

import { useLanguage } from '../i18n/useLanguage';
import { downloadCsv } from './csv';
import { DownloadCsvButtonProperties } from './DownloadCsvButton.properties';

const props = defineProps(DownloadCsvButtonProperties);
const { t } = useLanguage();
const loading = ref(false);

const download = async () => {
  loading.value = true;
  try {
    const rows = typeof props.rows === 'function' ? await props.rows() : props.rows;
    if (!rows) return;
    downloadCsv(props.columns, rows, props.fileName, {
      yes: t('table.yes', 'Yes'),
      no: t('table.no', 'No'),
    });
  } finally {
    loading.value = false;
  }
};
</script>
