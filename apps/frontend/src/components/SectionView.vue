<template>
  <div class="m-auto max-w-2xl w-2xl p-2 flex gap-2 flex-col overflow-auto">
    <Collapse title="Sections">
      <template #list>
        <CollapseRow v-if="sections?.length === 0">
          <div class="list-col-grow">
            <Alert message="No sections defined yet" type="info" />
          </div>
        </CollapseRow>
        <CollapseRow
          v-for="(section, index) in sections"
          :key="section.id"
          draggable="true"
          :class="{
            'opacity-50': dragIndex === index,
            'border-t-2 border-primary': dragOverIndex === index,
          }"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver($event, index)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, index)"
          @dragend="onDragEnd"
        >
          <div class="flex">
            <Btn
              tootip="Move section up"
              color="blank"
              :icon="IconEnum.ChevronUp"
              :outline="true"
              size="xs"
              :disabled="index === 0"
              @click="moveSection(section, index - 1)"
            />
            <Btn
              color="blank"
              tootip="Move section up"
              :icon="IconEnum.ChevronDown"
              :outline="true"
              size="xs"
              :disabled="index === sections.length - 1"
              @click="moveSection(section, index + 1)"
            />
          </div>
          <div class="text-xl font-thin opacity-30 tabular-nums">
            {{ section.section_number }}
          </div>
          <div class="list-col-grow">
            <div>{{ section.title }}</div>
          </div>
          <div class="flex gap-2">
            <Btn
              :icon="IconEnum.Edit"
              :outline="true"
              tooltip="Edit section"
              size="xs"
              @click="editSection(work, section)"
            />
            <Btn
              :icon="IconEnum.Text"
              :disabled="section.section_text?.length < 1"
              :outline="true"
              tooltip="Edit annotations"
              size="xs"
              @click="editAnnotations(work, section)"
            />
            <Btn
              :icon="IconEnum.Delete"
              :outline="true"
              tooltip="Delete section"
              size="xs"
              @click="sectionStore.delete(work, section)"
            />
          </div>
        </CollapseRow>
        <CollapseRow>
          <Btn
            :icon="IconEnum.Plus"
            :disabled="!work?.id"
            @click="createSection(work)"
          >
            Create section
          </Btn>
        </CollapseRow>
      </template>
    </Collapse>
  </div>
</template>
<script setup lang="ts">
import { computed, type Props } from "vue";
import { Alert, Btn, Collapse, CollapseRow, IconEnum } from "@ghentcdh/ui";
import type { UseResource } from "@ghentcdh/crouton-vue";
import { computedAsync, useCrouton, useResources } from "@ghentcdh/crouton-vue";
import type { Section, WorkWithRelations } from "@mela/generated-types";
import { useDragSort } from "../composables/useDragSort";
import { useSectionRouter } from "../utils/work.utils";

const props = defineProps({
  resource: { type: Object as Props<UseResource>, required: true as const },
  data: { type: Object as Props<WorkWithRelations>, required: true as const },
});

const work = computed(() => {
  return props.data;
});
const sections = computed(() => {
  return work.value?.section ?? [];
});

const crouton = useCrouton();
const config = computedAsync(() => crouton.getFormDef("section"));

const sectionStore = computed(() =>
  config.value ? useResources(config.value, {}) : null,
);
const { editSection, createSection, editAnnotations } = useSectionRouter();
const {
  dragIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
} = useDragSort((fromIndex, toIndex) => {
  // const section = workStore.sections[fromIndex];
  // workStore.moveSection(section, toIndex);
});

const moveSection = async (section: Section, newIndex: number) => {
  if (newIndex < 0 || newIndex >= sections.value.length) return;

  alert("implement me!!!");
};
</script>
