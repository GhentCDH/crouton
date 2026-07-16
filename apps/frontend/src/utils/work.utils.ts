import { useRouter } from 'vue-router';

import type { Section, Work } from '@mela/generated-types';
import { NEW_SECTION_ID } from './create-section';

export const useSectionRouter = () => {
  const router = useRouter();

  const editSection = (work: Work, section: Section) => {
    router.push({
      name: 'section-detail',
      params: { sectionId: section.id, workId: work.id },
    });
  };

  const editAnnotations = (work: Work, section: Section) => {
    router.push({
      name: 'annotation-editor',
      params: { sectionId: section.id, workId: work.id },
    });
  };

  const createSection = (work: Work) => {
    editSection(work, { id: NEW_SECTION_ID } as Section);
  };

  return { editSection, createSection, editAnnotations };
};
