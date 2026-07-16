import type { WorkWithRelations } from '@mela/generated-types';
import type { MenuWithItems } from '@ghentcdh/ui';

export type MenuView = 'annotate';

export const computeMenu = (
  work: WorkWithRelations,
  view: MenuView | null,
): MenuWithItems[] => {
  const routerLink =
    view === 'annotate' ? 'annotation-editor' : 'section-detail';

  return [
    {
      label: 'Sections',
      items: work?.section?.map((section) => ({
        label: `${section.section_number} - ${section.title}`,
        action: {
          routerLink,
          params: {
            sectionId: section.id,
          },
        },
      })),
    },
  ].filter((m) => !!m);
};
