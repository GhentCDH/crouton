import { describe, expect, it } from 'vitest';

import type { CompiledResource } from './compiled-resource.schema';
import {
  buildDefinitionPayload,
  buildResourceOperations,
  buildViewsPayload,
  deriveDisplay,
} from './payload-builders';
import type { Layout } from '../layout/schema';
import { invalid } from '../utils/test-utils';

const baseUri = 'http://host/annotation';

describe('buildResourceOperations — external uri', () => {
  it('uses crouton route for normal ops', () => {
    const def = { findAll: true, delete: true };
    const ops = buildResourceOperations(def as Record<string, unknown>, baseUri);
    expect(ops['findAll']).toEqual({ uri: baseUri, method: 'get' });
    expect(ops['delete']).toEqual({ uri: `${baseUri}/{id}`, method: 'delete' });
  });

  it('uses external uri for an external op', () => {
    const def = { findAll: true, delete: { uri: '/legacy/annotation/{id}' } };
    const ops = buildResourceOperations(def as Record<string, unknown>, baseUri);
    expect(ops['findAll']).toEqual({ uri: baseUri, method: 'get' });
    expect(ops['delete']).toEqual({ uri: '/legacy/annotation/{id}', method: 'delete' });
  });

  it('uses method override from external op when provided', () => {
    const def = { delete: { uri: '/legacy/annotation/{id}', method: 'put' } };
    const ops = buildResourceOperations(def as Record<string, unknown>, baseUri);
    expect(ops['delete']).toEqual({ uri: '/legacy/annotation/{id}', method: 'put' });
  });

  it('resolves {env.X} in external uris', () => {
    process.env['ANNOTATION_API'] = 'https://legacy.example.com';
    const def = { delete: { uri: '{env.ANNOTATION_API}/annotation/{id}' } };
    const ops = buildResourceOperations(def as Record<string, unknown>, baseUri);
    expect(ops['delete']).toEqual({ uri: 'https://legacy.example.com/annotation/{id}', method: 'delete' });
    delete process.env['ANNOTATION_API'];
  });
});

describe('deriveDisplay', () => {
  it('defaults to a modal without a custom component', () => {
    expect(deriveDisplay(undefined)).toEqual({
      mode: 'modal',
      customComponent: null,
    });
  });

  it('reads the form container mode and the view custom component', () => {
    expect(
      deriveDisplay(
        invalid<Layout>({
          form: { container: { mode: 'page', size: 'sm' } },
          view: { container: { mode: 'modal', size: 'sm' }, component: 'src/Page.vue' },
        }),
      ),
    ).toEqual({ mode: 'page', customComponent: 'src/Page.vue' });
  });

  it('falls back to the view container mode when the form has none', () => {
    expect(
      deriveDisplay(
        invalid<Layout>({
          view: { container: { mode: 'page', size: 'sm' } },
        }),
      ),
    ).toEqual({ mode: 'page', customComponent: null });
  });
});

describe('display is derived into the payloads', () => {
  const config = (layout: Layout | undefined) =>
    invalid<CompiledResource>({
      name: 'book',
      route: 'book',
      tag: 'Book',
      definition: {},
      layout,
      views: { view: { json_schema: {}, ui_schema: {} } },
    });

  const layout: Layout = {
    form: { container: { mode: 'page', size: 'sm' } },
    view: { container: { mode: 'modal', size: 'sm' }, component: 'src/Detail.vue' },
  };

  it('buildDefinitionPayload keeps display on the wire', () => {
    expect(buildDefinitionPayload(config(layout))['display']).toEqual({
      mode: 'page',
      customComponent: 'src/Detail.vue',
    });
  });

  it('buildViewsPayload keeps display on the wire', () => {
    expect(buildViewsPayload(config(layout))?.['display']).toEqual({
      mode: 'page',
      customComponent: 'src/Detail.vue',
    });
  });

  it('buildDefinitionPayload defaults to a modal without a layout', () => {
    expect(buildDefinitionPayload(config(undefined))['display']).toEqual({
      mode: 'modal',
      customComponent: null,
    });
  });
});
