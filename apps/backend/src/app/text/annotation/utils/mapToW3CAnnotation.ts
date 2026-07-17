import type { AnnotationWithRelations } from '@mela/generated-types';
import { w3cAnnotation, type W3CAnnotation } from '@ghentcdh/w3c-utils';
import {
  type AnnotationContext,
  AnnotationStyleContextBuilder,
} from '@ghentcdh/annotation-editor';
import { createUriForType } from './uri';

export const mapToW3CAnnotation = (
  annotationDef: AnnotationContext,
  annotation: AnnotationWithRelations,
): W3CAnnotation => {
  const data = w3cAnnotation()
    .setId(createUriForType('annotation', annotation.id))
    // .setContext(getContextUri(annotation.type.id))
    .setMotivation('tagging')
    .setCreated(annotation.created_at)
    .setModified(annotation.updated_at)
    .setCreator({
      type: 'Software',
      name: 'Ugent - Mela',
    });
  const type = AnnotationStyleContextBuilder();
  data.addContext(type.getContextUri());
  data.addBody(type.toAnnotationBody(annotationDef, 'styling'));

  const context = annotationDef.context;
  if (context) {
    data.addContext(context.getContextUri());

    if (
      context &&
      annotation.value &&
      Object.keys(annotation.value).length > 0
    ) {
      if (context.safeParse(annotation.value)?.success) {
        data.addBody(
          context.toAnnotationBody(annotation.value, annotation.type),
        );
      } else {
        console.warn(
          'Unable to parse annotation value',
          annotation.type,
          annotation.value,
        );
        // data.addBody(context.toAnnotationBody(annotation.value));
      }
    }
  }

  const { textSelector, relationsFrom, annotationSelector } = annotation;
  if (textSelector) {
    const { start, end, suffix, prefix, section_text_id, exact } = textSelector;
    const sourceUri = createUriForType('section_text', section_text_id);
    data
      .updateTextPositionSelector({ start, end }, sourceUri)
      .updateTextQuoteSelector(
        {
          exact: exact ?? '',
          prefix,
          suffix,
        },
        sourceUri,
      );
  }
  if (annotationSelector) {
    const { start, end, source_annotation_id } = annotationSelector;
    const sourceUri = createUriForType('annotation', source_annotation_id);
    data
      .addTarget({
        type: 'SpecificResource',
        source: sourceUri,
      })
      .updateTextPositionSelector({ start, end }, sourceUri);
  }

  relationsFrom?.forEach((relation) => {
    data.addTarget({
      type: 'SpecificResource',
      source: createUriForType('annotation', relation.annotation_to_id),
    });
  });


  return data.build();
};
