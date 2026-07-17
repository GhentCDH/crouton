import type { PropType } from 'vue';

export const SectionsMenuProperties = {
  workOpen: { type: Boolean, default: true },
  activeSectionOpen: { type: Boolean, default: true },
  sectionsOpen: { type: Boolean, default: true },
  mode: { type: String as PropType<'annotate' | 'edit'>, default: 'annotate' },
};
