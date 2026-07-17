import {
  computed,
  inject,
  type InjectionKey,
  provide,
  reactive,
  ref,
} from "vue";
import type { AnnotationWithRelations } from "@mela/generated-types";
import { useNavigation } from "./navigation";
import { croutonApiCall, useCrouton } from "@ghentcdh/crouton-vue";
import { NotificationService } from "@ghentcdh/ui";

const createAnnotationStore = () => {
  const annotations = ref([]);
  let annotationId: string | null = null;
  const loading = ref(false);
  const navigation = useNavigation();
  const Annotation = ref<AnnotationWithRelations>();
  const sections = computed(() => {
    const sections: Section[] = Annotation.value?.section ?? [];

    return sections.sort((a, b) => a.section_order - b.section_order);
  });

  const crouton = useCrouton();

  const reset = () => {
    annotationId = null;
    Annotation.value = null;
    loading.value = false;
  };

  const loadAnnotation = async () => {
    const formDef = await crouton.getFormDef("Annotation");
    if (!formDef) throw new Error("no form def");

    return croutonApiCall(formDef, "findOne", { id: annotationId })
      .then((data) => {
        const annotationData = data.data;
        if (annotationData.id !== annotationId) return;
        loading.value = false;
        Annotation.value = annotationData;
      })
      .catch((err) => {
        console.error("Failed to load Annotation ", err);
        NotificationService.error("Failed to load Annotation");
      });
  };

  const setId = (id: string) => {
    if (id === annotationId) return;
    reset();
    loading.value = true;
    annotationId = id;
    loadAnnotation();
  };

  return reactive({
    annotations,
  });
};

export type AnnotationStore = ReturnType<typeof createAnnotationStore>;

const WORK_STORE_KEY: InjectionKey<AnnotationStore> =
  Symbol("Annotation-store");

/** Call in the parent/root component to create and provide the store. */
export const provideAnnotationStore = () => {
  const store = createAnnotationStore();
  provide(WORK_STORE_KEY, store);
  return store;
};

/** Call in child components to get the existing store instance. */
export const useAnnotationStore = () => {
  const store = inject(WORK_STORE_KEY);
  if (!store)
    throw new Error(
      "Annotation store not provided. Call provideAnnotationStore() in a parent component.",
    );
  return store;
};
