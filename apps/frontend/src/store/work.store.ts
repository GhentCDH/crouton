import { computed, inject, provide, reactive, ref, type InjectionKey } from "vue";
import type { WorkWithRelations } from "@mela/generated-types";
import { useNavigation } from "./navigation";
import { croutonApiCall, useCrouton } from "@ghentcdh/crouton-vue";
import { NotificationService } from "@ghentcdh/ui";

const createWorkStore = () => {
  let workId: string | null = null;
  const loading = ref(false);
  const navigation = useNavigation();
  const work = ref<WorkWithRelations>();
  const sections = computed(() => {
    const sections: Section[] = work.value?.section ?? [];

    return sections.sort((a, b) => a.section_order - b.section_order);
  });

  const crouton = useCrouton();

  const reset = () => {
    workId = null;
    work.value = null;
    loading.value = false;
  };

  const loadWork = async () => {
    const formDef = await crouton.getFormDef("work");
    if (!formDef) throw new Error("no form def");

    return croutonApiCall(formDef, "findOne", { id: workId })
      .then((data) => {
        const workData = data.data;
        if (workData.id !== workId) return;
        loading.value = false;
        work.value = workData;
      })
      .catch((err) => {
        console.error("Failed to load work ", err);
        NotificationService.error("Failed to load work");
      });
  };

  const setId = (id: string) => {
    if (id === workId) return;
    reset();
    loading.value = true;
    workId = id;
    loadWork();
  };

  return reactive({
    work,
    loading,
    sections,
    setId,
    reload: loadWork,
    editWork: () => navigation.editWork(work.value),
    editAnnotations: (section: Section) =>
      navigation.editAnnotations(work.value, section),
    editSection: (section: Section) =>
      navigation.editSection(work.value, section),
  });
};

export type WorkStore = ReturnType<typeof createWorkStore>;

const WORK_STORE_KEY: InjectionKey<WorkStore> = Symbol("work-store");

/** Call in the parent/root component to create and provide the store. */
export const provideWorkStore = () => {
  const store = createWorkStore();
  provide(WORK_STORE_KEY, store);
  return store;
};

/** Call in child components to get the existing store instance. */
export const useWorkStore = () => {
  const store = inject(WORK_STORE_KEY);
  if (!store) throw new Error("Work store not provided. Call provideWorkStore() in a parent component.");
  return store;
};