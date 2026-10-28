import { describe, expect, it } from 'vitest';

import {
  JsonOperationsSchema,
  buildResourceDefinitions,
  buildResourceOperations, resolveDefinition 
} from '@ghentcdh/crouton-core';

import { invalid } from '../test-utils';



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
    const result = buildResourceOperations(
      resolveDefinition(invalid<Parameters<typeof resolveDefinition>[0]>({ definition })),
      BASE,
    );

    expect(result['delete']).toEqual({
      uri: '/annotation/{id}',
      method: 'delete',
    });
    expect(result['findOne']).toEqual({ uri: `${BASE}/{id}`, method: 'get' });
    expect(result['findAll']).toBeUndefined();
  });

  it('external uri with method override', () => {
    const ops = JsonOperationsSchema.parse({
      delete: { uri: '/annotation/{id}', method: 'post' },
    });
    const definition = buildResourceDefinitions(undefined, ops, undefined);
    const result = buildResourceOperations(
      resolveDefinition(invalid<Parameters<typeof resolveDefinition>[0]>({ definition })),
      BASE,
    );

    expect(result['delete']).toEqual({
      uri: '/annotation/{id}',
      method: 'post',
    });
  });
});
