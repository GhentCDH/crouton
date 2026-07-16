import { type CustomComponentEntry, customComponentIs } from '@ghentcdh/crouton-vue';
import SectionView from './SectionView.vue';

export const customComponents: CustomComponentEntry[] = [
  { tester: customComponentIs('section-view', 10), renderer: SectionView },
];
