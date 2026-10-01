import type { CroutonStatus, ResourceStatus } from './status.types';

export type StatusIssue = {
  severity: 'error' | 'warning' | 'info';
  source: 'backend' | 'database' | 'resource' | 'i18n';
  target: string;
  message: string;
  anchor: string;
};

export type ResourceState = 'error' | 'migration' | 'warning' | 'draft' | 'hidden' | 'ok';

export const stateClasses: Record<
  ResourceState,
  { dot: string; badge: string; border: string; text: string }
> = {
  error: {
    dot: 'bg-error',
    badge: 'bg-error/10 text-error border border-error/40',
    border: 'border-error/40',
    text: 'text-error',
  },
  migration: {
    dot: 'bg-warning',
    badge: 'bg-warning/10 text-warning border border-warning/40',
    border: 'border-warning/40',
    text: 'text-warning',
  },
  warning: {
    dot: 'bg-warning',
    badge: 'bg-warning/10 text-warning border border-warning/40',
    border: 'border-warning/40',
    text: 'text-warning',
  },
  draft: {
    dot: 'bg-base-300',
    badge: 'bg-base-200 text-base-content border border-base-300',
    border: 'border-base-300',
    text: 'text-base-content',
  },
  hidden: {
    dot: 'bg-base-300',
    badge: 'bg-base-200 text-base-content border border-base-300',
    border: 'border-base-300',
    text: 'text-base-content',
  },
  ok: {
    dot: 'bg-success',
    badge: 'bg-success/10 text-success border border-success/40',
    border: 'border-success/40',
    text: 'text-success',
  },
};

export const resourceState = (res: ResourceStatus): ResourceState => {
  if (res.draft) return 'draft';
  if (!res.valid) return 'error';
  if (res.expectedVersion != null && res.expectedVersion !== res.version) return 'migration';
  if (res.warnings?.length) return 'warning';
  if (res.hidden) return 'hidden';
  return 'ok';
};

const stateSortOrder: Record<ResourceState, number> = {
  error: 0,
  migration: 1,
  warning: 2,
  draft: 3,
  hidden: 4,
  ok: 5,
};

export const sortResources = (resources: ResourceStatus[]): ResourceStatus[] =>
  [...resources].sort((a, b) => {
    const diff = stateSortOrder[resourceState(a)] - stateSortOrder[resourceState(b)];
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

export const collectIssues = (status: CroutonStatus): StatusIssue[] => {
  const issues: StatusIssue[] = [];

  for (const db of status.databases) {
    if (!db.connected) {
      issues.push({
        severity: 'error',
        source: 'database',
        target: db.name,
        message: db.error ?? 'Connection failed',
        anchor: `db-${db.name}`,
      });
    }
  }

  for (const res of status.resources) {
    if (res.draft) continue;
    if (!res.valid) {
      issues.push({
        severity: 'error',
        source: 'resource',
        target: res.name,
        message: res.error ?? 'Invalid resource',
        anchor: `resource-${res.name}`,
      });
    } else if (res.expectedVersion != null && res.expectedVersion !== res.version) {
      issues.push({
        severity: 'warning',
        source: 'resource',
        target: res.name,
        message: `needs migration to v${res.expectedVersion}`,
        anchor: `resource-${res.name}`,
      });
    }
    for (const w of res.warnings ?? []) {
      issues.push({
        severity: 'warning',
        source: 'resource',
        target: res.name,
        message: w,
        anchor: `resource-${res.name}`,
      });
    }
  }

  if (status.i18n) {
    if (!status.i18n.active) {
      issues.push({
        severity: 'info',
        source: 'i18n',
        target: status.i18n.defaultLanguage,
        message: 'i18n is not active',
        anchor: 'i18n',
      });
    }
    for (const b of status.i18n.bundles) {
      if (b.emptyKeys > 0) {
        issues.push({
          severity: 'warning',
          source: 'i18n',
          target: b.language,
          message: `${b.emptyKeys} untranslated keys`,
          anchor: `i18n-${b.language}`,
        });
      }
    }
  }

  return issues;
};
