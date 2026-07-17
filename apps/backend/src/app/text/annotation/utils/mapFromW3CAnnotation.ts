import {
  w3cAnnotation,
  type W3CAnnotation,
  type W3CAnnotationBuilder,
} from '@ghentcdh/w3c-utils';
import { omit } from 'lodash-es';
import {
  AnnotationMetadataType,
  type AnnotationResourceDefinition,
  type AnnotationStyle,
  AnnotationStyleType,
} from '@ghentcdh/annotation-editor';
import { type AnnotationDto, type TextSelector } from './annotation-dto';

type AnnotationResourceDefinitionService = {
  getResourceFromUri: (
    uri: string,
  ) => (AnnotationResourceDefinition & { id: string }) | null;
  getResourceForType: (
    uri: string,
  ) => (AnnotationResourceDefinition & { id: string }) | null;
};
export const findPurpose = (builder: W3CAnnotationBuilder) => {
  const annotationStyle = builder.getBodiesByType(
    AnnotationStyleType,
  )?.[0] as AnnotationStyle;

  if (annotationStyle) return annotationStyle.id;

  // Fallback: extract purpose from metadata body
  const metadata = builder.getBodiesByType(AnnotationMetadataType)?.[0] as any;
  if (metadata?.purpose) return metadata.purpose;

  throw new Error('Annotation style not found and no purpose in metadata');
};

const mapValueFromBody = (
  builder: W3CAnnotationBuilder,
): Record<string, unknown> | null => {
  const metadata = builder.getBodiesByType(AnnotationMetadataType)?.[0] as any;
  return metadata ? omit(metadata, 'purpose', 'type') : null;
};

const findSpecifiedResource = (
  annotation: W3CAnnotationBuilder,
  type: string,
  resourceDefinitionService: AnnotationResourceDefinitionService,
) => {
  const sourceMetadata = resourceDefinitionService.getResourceForType(
    type,
  ) as AnnotationResourceDefinition;

  const prefix = sourceMetadata?.prefix ?? `mela:${type}/`;

  return annotation
    .getSpecificResourceTargets()
    .find((s) => s.source.startsWith(prefix));
};

const mapAnnotationSelector = (
  annotation: W3CAnnotationBuilder,
  resourceDefinitionService: AnnotationResourceDefinitionService,
) => {
  const resource = findSpecifiedResource(
    annotation,
    'annotation',
    resourceDefinitionService,
  );
  if (!resource || !resource.selector) return null;

  const sourceUri = resource?.source;
  const selector = annotation.getTextPositionSelector(sourceUri)[0];

  return {
    sectionTextId: getId('annotation', sourceUri),
    start: selector.start,
    end: selector.end,
  };
};

const getId = (type: 'annotation' | 'section_text', sourceUri: string) => {
  const prefix = `mela:${type}/`;
  if (!sourceUri.startsWith(prefix)) {
    throw new Error(`Invalid source URI: ${sourceUri}`);
  }
  return sourceUri.substring(prefix.length);
};

const mapTextSelector = (
  annotation: W3CAnnotationBuilder,
  resourceDefinitionService: AnnotationResourceDefinitionService,
): TextSelector | null => {
  const resource = findSpecifiedResource(
    annotation,
    'section_text',
    resourceDefinitionService,
  );
  if (!resource) return null;

  const sourceUri = resource.source;

  const selector = annotation.getTextPositionSelector(sourceUri)[0];
  if (!selector) return null;

  return {
    sectionTextId: getId('section_text', sourceUri),
    start: selector.start,
    end: selector.end,
  };
};

const mapRelationsFrom = (
  annotation: W3CAnnotationBuilder,
  resourceDefinitionService: AnnotationResourceDefinitionService,
): string[] => {
  const targets = annotation.getSpecificResourceTargets();

  return targets
    .map((t) => {
      if (!t.source) return null;
      const defintion = resourceDefinitionService.getResourceFromUri(
        t.source ?? '',
      );

      if (!defintion || defintion.type !== 'annotation') return null;

      return defintion.id;
    })
    .filter(Boolean) as string[];
};

export const mapFromW3CAnnotation = (
  annotation: W3CAnnotation,
  resourceDefinitionService: AnnotationResourceDefinitionService,
): AnnotationDto => {
  const data = w3cAnnotation(annotation);
  const result = {
    type: findPurpose(data),
    value: mapValueFromBody(data),
    textSelector: mapTextSelector(data, resourceDefinitionService),
    annotationSelector: mapAnnotationSelector(data, resourceDefinitionService),
    relations: mapRelationsFrom(data, resourceDefinitionService),
  };

  return result;
};
