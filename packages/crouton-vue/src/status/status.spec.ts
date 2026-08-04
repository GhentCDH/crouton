import { describe, expect, it } from 'vitest';

import { CroutonStatusRoutes } from './status.routes';

describe('CroutonStatusRoutes', () => {
  it('should export route at crouton-status path', () => {
    expect(CroutonStatusRoutes).toHaveLength(1);
    expect(CroutonStatusRoutes[0].path).toBe('crouton-status');
  });

  it('should lazy-load StatusView component', () => {
    expect(typeof CroutonStatusRoutes[0].component).toBe('function');
  });
});
