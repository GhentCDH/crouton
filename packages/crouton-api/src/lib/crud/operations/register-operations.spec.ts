import { describe, expect, it } from 'vitest';

import { JsonOperationsSchema } from '@ghentcdh/crouton-core';

import { createCrudController } from '../crud-controller.factory';
import type { Resource } from '../resource/ResourceConfig.schema';

// RequestMethod from @nestjs/common v11: GET=0, POST=1, PUT=2, DELETE=3, PATCH=4
const GET = 0;
const POST = 1;
const PUT = 2;
const DELETE = 3;
const PATCH = 4;

// NestJS v11 stores route/method metadata on the handler function itself, not (prototype, key).
const routeOf = (cls: any, methodName: string) =>
  Reflect.getMetadata('path', cls.prototype[methodName]);
const httpMethodOf = (cls: any, methodName: string) =>
  Reflect.getMetadata('method', cls.prototype[methodName]);

const allOps = JsonOperationsSchema.parse({});

const RESOURCE: Resource = {
  name: 'article',
  route: 'article',
  model: 'Article',
  tag: 'Articles',
  definition: { findAll: true, findOne: true, create: true, update: true, patch: true, delete: true },
  columns: [],
  subResources: [
    {
      childRoute: 'items',
      column: 'items',
      relation: 'items',
      childModel: 'Item',
      foreignKey: 'articleId',
      operations: allOps,
    },
  ],
};

describe('register-operations snapshot', () => {
  const cls = createCrudController(RESOURCE, '/api');

  describe('root methods', () => {
    // NestJS v11 normalises '' → '/'
    const cases = [
      { method: 'findAll', path: '/', httpMethod: GET },
      { method: 'findOne', path: ':id', httpMethod: GET },
      { method: 'create', path: '/', httpMethod: POST },
      { method: 'update', path: ':id', httpMethod: PUT },
      { method: 'patch', path: ':id', httpMethod: PATCH },
      { method: 'delete', path: ':id', httpMethod: DELETE },
    ];

    for (const { method, path, httpMethod } of cases) {
      it(`registers ${method} on prototype`, () => {
        expect(typeof cls.prototype[method]).toBe('function');
      });

      it(`${method} has route '${path}'`, () => {
        expect(routeOf(cls, method)).toBe(path);
      });

      it(`${method} has HTTP method ${httpMethod}`, () => {
        expect(httpMethodOf(cls, method)).toBe(httpMethod);
      });
    }
  });

  describe('child methods (items)', () => {
    const cases = [
      { method: 'findAllBy_items', path: ':id/items', httpMethod: GET },
      { method: 'findOneChild_items', path: ':id/items/:childId', httpMethod: GET },
      { method: 'createChild_items', path: ':id/items', httpMethod: POST },
      { method: 'updateChild_items', path: ':id/items/:childId', httpMethod: PUT },
      { method: 'patchChild_items', path: ':id/items/:childId', httpMethod: PATCH },
      { method: 'deleteChild_items', path: ':id/items/:childId', httpMethod: DELETE },
    ];

    for (const { method, path, httpMethod } of cases) {
      it(`registers ${method} on prototype`, () => {
        expect(typeof cls.prototype[method]).toBe('function');
      });

      it(`${method} has route '${path}'`, () => {
        expect(routeOf(cls, method)).toBe(path);
      });

      it(`${method} has HTTP method ${httpMethod}`, () => {
        expect(httpMethodOf(cls, method)).toBe(httpMethod);
      });
    }
  });
});
