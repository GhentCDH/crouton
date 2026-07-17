import { Inject, Injectable } from '@nestjs/common';
import { maxBy } from 'lodash-es';
import { type ZodType } from 'zod';
import { sectionSchema as SectionSchema } from '@mela/generated-default-types';
import { AnnotationRepository } from '../annotation/annotation-repository.service';
import { PrismaClient } from '@mela/generated-default-client';

const createSelectFromSchema = (schema: ZodType) => {
  const selectDetail: Record<string, any> = {};
  Object.keys(SectionSchema.shape).forEach((key) => {
    selectDetail[key] = true;
  });

  return selectDetail;
};

const sectionSelect = createSelectFromSchema(SectionSchema);

@Injectable()
export class SectionRepository {
  constructor(
    @Inject(PrismaClient) private readonly prisma: PrismaClient,
    @Inject(AnnotationRepository)
    private readonly annotationRepository: AnnotationRepository,
  ) {}

  private async getSectionsSorted(workId: string) {
    const sections_ = await this.prisma.section.findMany({
      where: { work_id: workId },
      include: {
        section_text: true,
      },
    });

    const sections = sections_.sort(
      (s1, s2) => s1.section_order - s2.section_order,
    );

    return sections;
  }

  private async getWorkSectionsSorted(id: string) {
    const section = await this.findOne(id);

    return this.getSectionsSorted(section.work_id);
  }

  public async findAnnotations(id: string) {
    //first get section text content ids
    //then get related text ids

    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        section_text: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!section) return [];
    const textIds = section.section_text.map((text) => text.id);

    return this.annotationRepository.findForTextIds(textIds);
  }

  private findOne(id: string) {
    return this.prisma.section.findUniqueOrThrow({
      where: { id },
    });
  }

  async moveSection(sectionId: string, newOrder: number) {
    const [section, sections] = await Promise.all([
      this.findOne(sectionId),
      this.getWorkSectionsSorted(sectionId),
    ]);
    const maxSectionOrder =
      maxBy(sections, "section_order")?.section_order ?? -1;

    const sectionsToSave = [] as { id: string; section_order: number }[];
    const [prevPosition] = sections.splice(section.section_order, 1);
    sections.splice(newOrder, 0, prevPosition);

    sections.forEach((section, index) => {
      if (section.section_order !== index) {
        sectionsToSave.push({ id: section.id, section_order: index });
      }
    });

    await Promise.all(
      sectionsToSave.map((s) =>
        this.prisma.section.update({
          where: { id: s.id },
          data: { section_order: s.section_order },
        }),
      ),
    );
    return this.findOne(sectionId);
  }
}
