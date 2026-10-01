import { describe, expect, it } from 'vitest';

import { CROUTON_STATUS } from '../router';
import { CroutonStatusRoutes } from './status.routes';

describe('CroutonStatusRoutes', () => {
  it('should export route at crouton-status path', () => {
    expect(CroutonStatusRoutes).toHaveLength(1);
    expect(CroutonStatusRoutes[0].path).toBe('crouton-status');
  });

  it('should have CROUTON_STATUS name', () => {
    expect(CroutonStatusRoutes[0].name).toBe(CROUTON_STATUS);
  });

  it('should lazy-load StatusView component', () => {
    expect(typeof CroutonStatusRoutes[0].component).toBe('function');
  });
});
