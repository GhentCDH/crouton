import {
  computed,
  inject,
  type InjectionKey,
  provide,
  reactive,
  ref,
} from "vue";
import { croutonApiCall, useCrouton } from "@ghentcdh/crouton-vue";
import { NotificationService } from "@ghentcdh/ui";

const createSectionStore = () => {
  let sectionId: string | null = null;
  const loading = ref(false);
  const section = ref<Section>();

  const crouton = useCrouton();

  const reset = () => {
    sectionId = null;
    section.value = null;
    loading.value = false;
  };

  const loadSection = async () => {
    const formDef = await crouton.getFormDef("section");
    console.log("formdef");
    if (!formDef) throw new Error("no form def");
    console.log("calling the route", sectionId);
    return croutonApiCall(formDef, "findOne", { id: sectionId })
      .then((data) => {
        const sectionData = data.data;
        if (sectionData.id !== sectionId) return;
        loading.value = false;
        section.value = sectionData;
      })
      .catch((err) => {
        console.error("Failed to load section", err);
        NotificationService.error("Failed to load section");
      });
  };

  const setId = (id: string) => {
    if (id === sectionId) return;
    reset();
    loading.value = true;
    sectionId = id;
    loadSection();
  };

  const sources = computed(() => {
    return section.value ?? [];
  });

  return reactive({
    section,
    loading,
    sources,
    setId,
    reload: loadSection,
  });
};

export type SectionStore = ReturnType<typeof createSectionStore>;

const SECTION_STORE_KEY: InjectionKey<SectionStore> = Symbol("section-store");

/** Call in the parent/root component to create and provide the store. */
export const provideSectionStore = () => {
  const store = createSectionStore();
  provide(SECTION_STORE_KEY, store);
  return store;
};

/** Call in child components to get the existing store instance. */
export const useSectionStore = () => {
  const store = inject(SECTION_STORE_KEY);
  if (!store)
    throw new Error(
      "Section store not provided. Call provideSectionStore() in a parent component.",
    );
  return store;
};
