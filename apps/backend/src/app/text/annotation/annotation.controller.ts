import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type W3CAnnotation } from '@ghentcdh/w3c-utils';
import { AnnotationDefinitionService, AnnotationResourceDefinitionService } from '@ghentcdh/annotation-api';
import { AnnotationRepository } from './annotation-repository.service';
import { AnnotationW3CRepositoryService } from './annotation.repository';
import { mapFromW3CAnnotation, mapToW3CAnnotation } from './utils';

@Controller("annotation")
@ApiTags("Annotations")
export class AnnotationController {
  constructor(
    @Inject(AnnotationW3CRepositoryService)
    private annotationTypeRepository: AnnotationW3CRepositoryService,

    @Inject(AnnotationRepository)
    private annotationRepository: AnnotationRepository,

    @Inject(AnnotationDefinitionService)
    private annotationDefinitionService: AnnotationDefinitionService,

    @Inject(AnnotationResourceDefinitionService)
    private annotationResourceDefinitionService: AnnotationResourceDefinitionService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a W3C annotation" })
  @ApiBody({ description: "W3C annotation body" })
  @ApiResponse({ status: 201, description: "The created W3C annotation" })
  async create(@Body() annotationBody: W3CAnnotation) {
    const annotation = await this.annotationTypeRepository.create(
      mapFromW3CAnnotation(
        annotationBody,
        this.annotationResourceDefinitionService,
      ),
    );

    return this.get(annotation.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one annotation by id" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "The W3C annotation" })
  async get(@Param("id") id: string) {
    const annotation = await this.annotationRepository.findOne(id);

    const annotationDef = await this.annotationDefinitionService.findById(
      annotation.type,
    );

    return mapToW3CAnnotation(annotationDef as any, annotation);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an annotation" })
  @ApiParam({ name: "id", type: "string" })
  @ApiBody({ description: "W3C annotation body" })
  @ApiResponse({ status: 200, description: "The updated W3C annotation" })
  async patch(@Param("id") id: string, @Body() annotationBody: W3CAnnotation) {
    const _id =
      this.annotationResourceDefinitionService.getResourceFromUri(id)?.id ?? id;

    const annotation = await this.annotationTypeRepository.update(
      _id,
      mapFromW3CAnnotation(
        annotationBody,
        this.annotationResourceDefinitionService,
      ),
    );

    return this.get(annotation.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an annotation" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, description: "Annotation deleted" })
  async delete(@Param("id") id: string) {
    const _id =
      this.annotationResourceDefinitionService.getResourceFromUri(id)?.id ?? id;
    return this.annotationRepository.delete(_id);
  }
}
