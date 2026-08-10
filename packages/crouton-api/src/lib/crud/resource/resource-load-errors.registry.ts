export interface ResourceLoadError {
  name: string;
  path: string;
  error: string;
  /** Version found on disk (for schema-version / migration failures). */
  version?: number;
  /** Version crouton expected (`CURRENT_RESOURCE_VERSION`). */
  expectedVersion?: number;
}

class ResourceLoadErrorsRegistry {
  private errors: ResourceLoadError[] = [];

  record(e: ResourceLoadError) {
    this.errors.push(e);
  }

  getAll() {
    return [...this.errors];
  }

  clear() {
    this.errors = [];
  }
}

export const resourceLoadErrorsRegistry = new ResourceLoadErrorsRegistry();