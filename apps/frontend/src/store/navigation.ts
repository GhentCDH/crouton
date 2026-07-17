import { useRouter } from "vue-router";
import type { Section, Work } from "@mela/generated-default-types";
import { CROUTON_FORM } from "@ghentcdh/crouton-vue";

export const useNavigation = () => {
  const router = useRouter();
  const editSection = (work: Work, section: Section) => {
    router.push({
      name: "section-detail",
      params: { sectionId: section.id, workId: work.id },
    });
  };

  const editAnnotations = (work: Work, section: Section) => {
    router.push({
      name: "annotation-editor",
      params: { sectionId: section.id, workId: work.id },
    });
  };
  const editWork = (work: Work) => {
    router.push({
      name: CROUTON_FORM,
      params: { event: "edit", id: work.id },
    });
  };
  return {
    editSection,
    editAnnotations,
    editWork,
  };
};
