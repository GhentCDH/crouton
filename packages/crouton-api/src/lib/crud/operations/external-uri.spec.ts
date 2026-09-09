import { describe, expect, it } from 'vitest';

import { JsonOperationsSchema } from '@ghentcdh/crouton-core';

import { buildResourceDefinitions } from '../builder/schema.helpers';
import { resolveDefinition } from '../crud.config';
import { buildResourceOperations } from './payload-builders';

const BASE = 'http://host/example';

describe('external uri — end-to-end', () => {
  it('delete with external uri uses it in operations map', () => {
    const ops = JsonOperationsSchema.parse({
      findAll: false,
      findOne: true,
      patch: false,
      create: false,
      update: false,
      delete: { uri: '/annotation/{id}' },
    });

    const definition = buildResourceDefinitions(undefined, ops, undefined);
    const result = buildResourceOperations(resolveDefinition({ definition }), BASE);

    expect(result['delete']).toEqual({ uri: '/annotation/{id}', method: 'delete' });
    expect(result['findOne']).toEqual({ uri: `${BASE}/{id}`, method: 'get' });
    expect(result['findAll']).toBeUndefined();
  });

  it('external uri with method override', () => {
    const ops = JsonOperationsSchema.parse({
      delete: { uri: '/annotation/{id}', method: 'post' },
    });
    const definition = buildResourceDefinitions(undefined, ops, undefined);
    const result = buildResourceOperations(resolveDefinition({ definition }), BASE);

    expect(result['delete']).toEqual({ uri: '/annotation/{id}', method: 'post' });
  });
});
