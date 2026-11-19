import { describe, expect, it } from 'vitest';

import { DataSourceRegistry } from '../data-access/adapter';
import { ResourceConfigRegistry } from '../resource-config.registry';
import { DevResourcesController } from './dev-resources.controller';

// Regression for #596: a type-only import of a constructor dependency drops
// its runtime token, so Nest could not resolve the controller in dev mode.
describe('DevResourcesController DI tokens', () => {
  it('injects DataSourceRegistry and ResourceConfigRegistry by class', () => {
    const tokens = (
      Reflect.getMetadata('self:paramtypes', DevResourcesController) as {
        index: number;
        param: unknown;
      }[]
    )
      .sort((a, b) => a.index - b.index)
      .map((p) => p.param);

    expect(tokens).toEqual([DataSourceRegistry, ResourceConfigRegistry]);
  });
});
