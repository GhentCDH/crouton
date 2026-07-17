<template>
  <Drawer class="_h-full" :width-left="300" :width-right="20">
    <template #left-drawer>
      <div class="gap-2 flex flex-col">
        <SectionsMenu :mode="'edit'" />
      </div>
    </template>
    <Loading :loading="!formData" />
    <div class="h-full flex flex-col gap-2 overflow-hidden">
      <AutoSaveForm
        v-if="formData && formSchema"
        :id="id"
        :data="formData"
        create-title="Section Details"
        :schema="formSchema.schemas.form.data"
        :ui-schema="formSchema.schemas.form.ui"
        :uri="formSchema.route"
        :scrollable="true"
        :full-height="true"
        @success="updateSection"
        @events="handleFormEvents"
      >
        <template #actions>
          <Btn
            :outline="true"
            :disabled="textId === NEW_SECTION_ID || !textId"
            @click="goToAnnotations"
          >
            Create annotations
          </Btn>
        </template>
      </AutoSaveForm>
    </div>
  </Drawer>
</template>
<script setup lang="ts">
import { ref, toRaw, watch } from "vue";
import { useRouter } from "vue-router";
import { Btn, Drawer } from "@ghentcdh/ui";
import { type Section } from "@mela/generated-types";
import { computedAsync } from "@vueuse/core";
import { handleFormEvents, useCrouton } from "@ghentcdh/crouton-vue";
import { AutoSaveForm } from "@ghentcdh/crouton-forms-vue";
import SectionsMenu from "../../components/SectionsMenu.vue";
import { NEW_SECTION_ID } from "../../utils/create-section";
import { useWorkStore } from "../../store/work.store";
import { useSectionStore } from "../../store/section.store";

const id = `section-${Date.now()}`;
const sectionStore = useSectionStore();

const formData = ref(null);
const app = useCrouton();
const formSchema = computedAsync(() => app.getFormDef("section"));
const workStore = useWorkStore();
const router = useRouter();

const textId = ref(null);

const goToAnnotations = () => {
  if (!textId.value) return;

  workStore.editAnnotations(sectionStore.section);
};

const updateSection = (section: Section): void => {
  sectionStore.reload();
  workStore.reload();
  router.push({ name: "section-detail", params: { sectionId: section.id } });
};

watch(
  () => sectionStore.section,
  () => {
    console.log("section store data loaded");
    const section = sectionStore.section ?? null;
    console.log(section);
    formData.value = toRaw(section);
    textId.value = section?.id;
  },
  { immediate: true },
);
</script>
