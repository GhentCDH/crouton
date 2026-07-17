<template>
  <Drawer class="_h-full" :width-left="300">
    <Loading :loading="!sectionStore.section" />

    <AnnotationEditor
      :configuration="configuration"
      :sources="sectionStore.sources"
      :annotations="annotationStore.annotations"
      :annotation-definitions="definitions"
      :selected-annotation-id="selectedAnnotationId"
      :selected-annotation-action="selectedAnnotationAction"
      @create:annotation="createAnnotation"
      @create:annotation:events="handleFormEvents"
      @delete:annotation="deleteAnnotation"
      @update:annotation="updateAnnotation"
      @select:annotation="selectAnnotation"
    />
    <template #left-drawer>
      <div class="gap-2 flex flex-col">
        <AnnotationFilter />
        <SectionsMenu :mode="'annotate'" />
      </div>
    </template>
  </Drawer>
</template>
<script setup lang="ts">
import { Drawer, Loading } from '@ghentcdh/ui';
import { type AnnotationDefConfig, AnnotationEditor } from '@ghentcdh/annotation-editor';
import { type W3CAnnotation } from '@ghentcdh/w3c-utils';
import { handleFormEvents } from '@ghentcdh/crouton-vue';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { provideAnnotationDefinitions } from '@ghentcdh/annotation-vue';
import { useSectionStore } from '../../store/section.store';
import { provideAnnotationStore } from '../../store/annotation.store';
import AnnotationFilter from '../../components/annotation-filter.vue';
import SectionsMenu from '../../components/SectionsMenu.vue';

const route = useRoute();
const router = useRouter();
const storeId = `identify_and_translate_${Date.now()}`;

const selectedAnnotationId = computed(
  () => route.query.annotationId as string | undefined,
);
const selectedAnnotationAction = computed(
  () => route.query.action as string | undefined,
);
const sectionStore = useSectionStore();
const annotationStore = provideAnnotationStore();
const { definitions } = provideAnnotationDefinitions({});

const createAnnotation = (annotation: W3CAnnotation) => {
  return annotationStore.createAnnotation(annotation);
};
const deleteAnnotation = (annotation: W3CAnnotation) => {
  return annotationStore.deleteAnnotation(annotation);
};

const updateAnnotation = (annotation: W3CAnnotation) => {
  return annotationStore.updateAnnotation(annotation.id, annotation);
};

const configuration: AnnotationDefConfig = {
  // baseUrl: mela_env.ANNOTATION_BASE_URL,
  cacheTTLms: 0,
  isDev: false,
  // app: mela_env.ANNOTATION_APP ?? "mela",
  // prefix: mela_env.ANNOTATION_PREFIX ?? "mela",
};

const selectAnnotation = (
  annotation: W3CAnnotation | null,
  action: string | null,
) => {
  const query = { ...route.query };
  if (annotation) {
    query.annotationId = annotation.id;
  } else {
    delete query.annotationId;
  }
  if (action) {
    query.action = action;
  } else {
    delete query.action;
  }
  router.replace({ query });
};
</script>
