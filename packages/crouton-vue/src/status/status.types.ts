export interface DatabaseStatus {
  name: string;
  connected: boolean;
  error?: string;
}

export interface ResourceStatus {
  name: string;
  path: string;
  valid: boolean;
  error?: string;
}

export interface StatusSummary {
  ok: boolean;
  databaseErrors: number;
  resourceErrors: number;
}

export interface CroutonStatus {
  version: string;
  environment: string;
  summary: StatusSummary;
  databases: DatabaseStatus[];
  resources: ResourceStatus[];
}