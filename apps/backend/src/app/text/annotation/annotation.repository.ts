import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { AnnotationDefinitionService } from "@ghentcdh/annotation-api";
import { AnnotationRepository } from "./annotation-repository.service";
import { PrismaClient } from "@mela/generated-default-client";
import { AnnotationDto } from "./utils"; // import { selectTextInMarkdown } from '@ghentcdh/annotated-text--markdown';
// import { selectTextInMarkdown } from '@ghentcdh/annotated-text--markdown';

const selectTextInMarkdown = (
  content: string,
  start: number,
  end: number,
  contextLength = 10,
) => {
  const prefixStart = Math.max(0, start - contextLength);
  const suffixEnd = Math.min(content.length, end + contextLength);

  return {
    prefix: content.substring(prefixStart, start),
    exact: content.substring(start, end),
    suffix: content.substring(end, suffixEnd),
  };
};
@Injectable()
export class AnnotationW3CRepositoryService {
  constructor(
    @Inject(PrismaClient) private readonly prisma: PrismaClient,
    @Inject(AnnotationRepository)
    private readonly annotationRepository: AnnotationRepository,
    @Inject(AnnotationDefinitionService)
    private readonly annotationDefinitionService: AnnotationDefinitionService,
  ) {}

  async create(data: AnnotationDto) {
    return this.createOrUpdate(null, data);
  }

  async update(id: string, data: AnnotationDto) {
    return this.createOrUpdate(id, data);
  }

  private async getType(type: string) {
    return this.annotationDefinitionService.findById(type);
  }

  private async getSectionText(sectionTextId: string) {
    return this.prisma.sectionText
      .findFirstOrThrow({
        where: { id: sectionTextId },
      })
      .catch((eror) => {
        throw new BadRequestException(`Invalid text content: ${sectionTextId}`);
      });
  }
  private async getAnnotation(annotationId: string) {
    return this.prisma.annotation
      .findFirstOrThrow({
        where: { id: annotationId },
      })
      .catch((eror) => {
        throw new BadRequestException(`Invalid annotation ${annotationId}`);
      });
  }

  private async validateData(type: string, value: any) {
    const [context] = await Promise.all([this.getType(type)]);

    if (!context) return { data: null, type };

    const data = context.context.safeParse(value);
    if (!data.success) {
      throw new BadRequestException(
        `Invalid value for annotation type: ${type}`,
        data.error,
      );
    }

    return { type: type, value: data.data ?? {} };
  }

  private async getTextSelector(data: AnnotationDto) {
    const _textSelector = data.textSelector;
    if (!_textSelector) return null;

    const sectionText = await this.getSectionText(_textSelector.sectionTextId);
    const { start, end } = _textSelector;

    const { prefix, exact, suffix } = selectTextInMarkdown(
      sectionText.content,
      start,
      end,
      10,
    );
    return {
      start,
      end,
      suffix,
      exact,
      prefix,
      // exact: selected.exact,
      sectionText: { connect: { id: sectionText.id } },
    };
  }
  private async getAnnotationSelector(data: AnnotationDto) {
    const annotationSelector = data.annotationSelector;
    if (!annotationSelector) return null;

    const annotation = await this.getAnnotation(
      annotationSelector.annotationId,
    );
    const { start, end } = annotationSelector;

    return {
      start,
      end,
      sourceAnnotation: { connect: { id: annotation.id } },
    };
  }

  private async _createAnnotation(
    id: string | null,
    type: string,
    value: any,
    textSelector: any | null,
    annotationSelector: any | null,
  ) {
    if (!id) {
      return this.prisma.annotation.create({
        data: {
          type,
          value,
          annotationSelector: annotationSelector
            ? {
                create: annotationSelector,
              }
            : undefined,
          textSelector: textSelector
            ? {
                create: textSelector,
              }
            : undefined,
        },
      });
    }

    const existing = await this.prisma.annotation.findUniqueOrThrow({
      where: { id },
      select: {
        annotationSelector: { select: { id: true } },
        textSelector: { select: { id: true } },
      },
    });

    const annotationSelectorOp = annotationSelector
      ? existing.annotationSelector
        ? { update: annotationSelector }
        : { create: annotationSelector }
      : existing.annotationSelector
        ? { delete: true }
        : undefined;

    const textSelectorOp = textSelector
      ? existing.textSelector
        ? { update: textSelector }
        : { create: textSelector }
      : existing.textSelector
        ? { delete: true }
        : undefined;

    return this.prisma.annotation.update({
      where: { id },
      data: {
        type,
        value,
        annotationSelector: annotationSelectorOp,
        textSelector: textSelectorOp,
      },
    });
  }

  public async createOrUpdate(
    id: string | null,
    data: AnnotationDto,
  ): Promise<AnnotationWithRelations> {
    const [{ type, value }, textSelector, annotationSelector] =
      await Promise.all([
        this.validateData(data.type, data.value),
        this.getTextSelector(data),
        this.getAnnotationSelector(data),
      ]);

    const annotation = await this._createAnnotation(
      id,
      type,
      value,
      textSelector,
      annotationSelector,
    );

    if (!data.relations)
      return this.annotationRepository.findOne(annotation.id);

    // create the relations, if it already exist skip it
    await this.prisma.annotationRelation.createMany({
      data: data.relations.map((id) => ({
        annotation_from_id: annotation.id,
        annotation_to_id: id,
      })),
      skipDuplicates: true,
    });

    return this.annotationRepository.findOne(annotation.id);
  }
}
