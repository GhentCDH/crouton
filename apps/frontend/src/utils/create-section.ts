import type { SectionWithRelations } from '@mela/generated-types';
import type { SectionDto } from '@mela/core';

const DEFAULT_SOURCE = {
  id: null,
  language: 'gr',
  content: '',
  text_type: 'SOURCE',
};

const DEFAULT_TRANSLATION = {
  id: null,
  language: 'en',
  content: '',
  text_type: 'TRANSLATION',
};

export const NEW_WORK_ID = 'NEW_WORK_ID';
export const NEW_SECTION_ID = 'NEW_SECTION_ID';

const findSource = (section: Partial<SectionWithRelations>, defaultSource) => {
  const textContent = section.section_text ?? [];

  return (
    textContent.find((t) => t.text_type === defaultSource.text_type) ??
    defaultSource
  );
};

export const createSectionDto = (
  workId: string,
  section: Partial<SectionWithRelations>,
): SectionDto => {
  const source = findSource(section, DEFAULT_SOURCE);
  const translation = findSource(section, DEFAULT_TRANSLATION);

  const newSection: SectionDto = {
    id: section.id ?? undefined,
    section_number: section.section_number ?? null,
    title: section.title ?? null,
    section_text: [source, translation],
    work: { id: workId },
  };
  return newSection;
};
