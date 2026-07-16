import type { Section, WorkWithRelations } from '@mela/generated-types';
import { NEW_SECTION_ID } from './create-section';

export const computeBreadcrumb = (
  work: WorkWithRelations,
  section: Section,
) => {
  return [
    {
      label: 'Works',
      routerLink: 'work-index',
    },
    {
      label: `${work?.title} (${work?.author?.name})`,
      routerLink: 'work-detail',
      params: { workId: work?.id },
    },
    section
      ? section.id === NEW_SECTION_ID
        ? { label: 'New section' }
        : {
            label: `${section?.section_number} - ${section?.title}`,
            routerLink: 'section-detail',
            params: { workId: work?.id, sectionId: section?.id },
          }
      : null,
  ].filter((m) => !!m);
};
