export interface ResourceLoadError {
  name: string;
  path: string;
  error: string;
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