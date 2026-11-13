import type { INestApplicationContext } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';

import { ResourceConfigRegistry } from './resource-config.registry';

type Tag = NonNullable<OpenAPIObject['tags']>[number];

/** Add each resource's `openapi.description` to the matching tag of an OpenAPI document. */
export const withResourceTagDescriptions = (
  document: OpenAPIObject,
  resources: { tag: string; tagDescription?: string }[],
): OpenAPIObject => {
  const tags = new Map<string, Tag>((document.tags ?? []).map((t) => [t.name, t]));
  for (const { tag, tagDescription } of resources) {
    const existing = tags.get(tag);
    if (tagDescription && !existing?.description)
      tags.set(tag, { ...existing, name: tag, description: tagDescription });
  }
  return { ...document, tags: [...tags.values()] };
};

/**
 * Swagger only reads tag descriptions from `DocumentBuilder.addTag`. Call this on the
 * created document to apply `openapi.description` from every loaded resource.json.
 */
export const applyResourceTagDescriptions = async (
  app: INestApplicationContext,
  document: OpenAPIObject,
): Promise<OpenAPIObject> =>
  withResourceTagDescriptions(document, await app.get(ResourceConfigRegistry).getAll());
