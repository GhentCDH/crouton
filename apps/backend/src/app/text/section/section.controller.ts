import { Body, Controller, Get, Inject, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AnnotationDefinitionService } from '@ghentcdh/annotation-api';
import { SectionRepository } from './section.repository';
import { type MoveSectionDto } from './dto';
import { mapToW3CAnnotation } from '../annotation/utils';

/**
 * Non-CRUD routes for sections. The standard CRUD (list / findOne /
 * create / update / delete) is generated from `SectionResource` by
 * `CrudModule`. NestJS mounts multiple controllers under the same
 * path prefix as long as no `method + path` pair collides.
 */
// @UsePipes(ZodValidationPipe)
@Controller("section")
@ApiTags("Sections")
@ApiBearerAuth()
export class SectionController {
  constructor(
    @Inject(SectionRepository) private readonly repository: SectionRepository,
    @Inject(AnnotationDefinitionService)
    private readonly annotationDefinitionService: AnnotationDefinitionService,
  ) {}

  @Get("/:id/annotation")
  @ApiOperation({ summary: "Get W3C annotations for a section" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Array of W3C annotations" })
  async findAnnotations(@Param("id") id: string) {
    const [annotations, builders] = await Promise.all([
      this.repository.findAnnotations(id),
      this.annotationDefinitionService.findAllGrouped(),
    ]);

    return annotations.map((a) => mapToW3CAnnotation(builders[a.type], a));
  }

  @Put("/:id/move")
  @ApiOperation({ summary: "Move a section to a new position" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "The moved section" })
  async moveSection(@Param("id") id: string, @Body() dto: MoveSectionDto) {
    return this.repository.moveSection(id, dto.section_order) as any;
  }
}
