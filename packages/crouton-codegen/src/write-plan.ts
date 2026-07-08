/** Write plan produced by the `apply` stage. */

export interface FileWrite {
  /** Absolute or project-relative path. */
  path: string;
  contents: string;
  action: 'create' | 'update';
}

export interface WritePlan {
  resource: string;
  files: FileWrite[];
  /** Notes surfaced to the user (e.g. unwired relations, composite-id warnings). */
  notes: string[];
}