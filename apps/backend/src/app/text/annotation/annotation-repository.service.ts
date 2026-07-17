import { Inject, Injectable } from "@nestjs/common";
import { PrismaClient } from "@mela/generated-default-client";

@Injectable()
export class AnnotationRepository {
  private readonly include = {
    textSelector: true,
    annotationSelector: true,
    relationsTo: true,
    relationsFrom: true,
  };

  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  findOne(id: string): Promise<AnnotationWithRelations> {
    return this.prisma.annotation.findUniqueOrThrow({
      where: { id },
      include: this.include,
    }) as unknown as Promise<AnnotationWithRelations>;
  }

  async delete(id: string) {
    // find relations that also should be deleted
    const annotation = (await this.findOne(id)) as AnnotationWithRelations;
    const relations = annotation.relationsTo.map((r) => r.annotation_from_id);

    const toDeleteIds = [id, relations].flat();

    if (annotation.relationsFrom.length || annotation.relationsTo.length) {
      await this.prisma.annotationRelation.deleteMany({
        where: {
          OR: [
            { annotation_from_id: { in: toDeleteIds } },
            { annotation_to_id: { in: toDeleteIds } },
          ],
        },
      });
    }

    return this.prisma.annotation.deleteMany({
      where: { id: { in: toDeleteIds } },
    });
  }

  async findForTextIds(textIds: string[]) {
    const annotations = await this.prisma.annotation.findMany({
      include: this.include,
      where: { textSelector: { section_text_id: { in: textIds } } },
    });
    const relationIds = annotations
      .map((s) => s.relationsTo.map((r) => r.annotation_from_id))
      .flat();

    const relatedAnnotations = await this.prisma.annotation.findMany({
      include: {
        textSelector: true,
        annotationSelector: true,
        relationsTo: true,
        relationsFrom: true,
      },
      where: { id: { in: relationIds } },
    });
    return [annotations, relatedAnnotations].flat();
  }
}
