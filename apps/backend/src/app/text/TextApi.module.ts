import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnnotationApiModule } from "@ghentcdh/annotation-api";
import { PrismaClient } from "@mela/generated-default-client";
import client from "../data-sources/default";

import { AnnotationRepository } from "./annotation/annotation-repository.service";
import { AnnotationW3CRepositoryService } from "./annotation/annotation.repository";
import { SectionController } from "./section/section.controller";
import { SectionRepository } from "./section/section.repository";
import { AnnotationController } from "./annotation/annotation.controller";

@Module({
  imports: [HttpModule, ConfigModule, AnnotationApiModule],
  controllers: [AnnotationController, SectionController],
  providers: [
    { provide: PrismaClient, useValue: client },
    AnnotationW3CRepositoryService,
    AnnotationRepository,
    SectionRepository,
  ],
})
export class TextApiModule {}
