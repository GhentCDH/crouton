/**
 * Non-error notices from the resource load pass, complementing `resourceLoadErrorsRegistry`
 * (which holds failures). Records resources that were auto-migrated on disk (`migrated`) or
 * are present but intentionally not served (`draft`), so the status page can show them
 * distinctly from hard errors. Like the errors registry it's a per-load singleton, cleared
 * at the start of every `loadResourceConfigsFromDir`.
 */

export interface MigratedResourceNotice {
  state: 'migrated';
  name: string;
  path: string;
  from: number;
  to: number;
}

export interface DraftResourceNotice {
  state: 'draft';
  name: string;
  path: string;
  version?: number;
}

export type ResourceLoadNotice = MigratedResourceNotice | DraftResourceNotice;

class ResourceLoadReportRegistry {
  private notices: ResourceLoadNotice[] = [];

  record(n: ResourceLoadNotice) {
    this.notices.push(n);
  }

  getAll() {
    return [...this.notices];
  }

  getByState<S extends ResourceLoadNotice['state']>(
    state: S,
  ): Extract<ResourceLoadNotice, { state: S }>[] {
    return this.notices.filter(
      (n): n is Extract<ResourceLoadNotice, { state: S }> => n.state === state,
    );
  }

  clear() {
    this.notices = [];
  }
}

export const resourceLoadReportRegistry = new ResourceLoadReportRegistry();
