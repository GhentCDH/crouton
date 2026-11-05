import type { DataSourceAdapter } from './data-source.adapter';

/**
 * In-memory reference adapter — useful for tests and as a template for custom
 * adapters. Not intended for production use.
 *
 * Seed model rows with `seed(model, rows)` before the test; `supports(model)`
 * returns `true` for every seeded model.
 */
export class InMemoryDataSourceAdapter implements DataSourceAdapter {
  readonly kind = 'in-memory' as const;
  readonly client = undefined;

  private readonly store = new Map<string, unknown[]>();

  seed(model: string, rows: unknown[]): this {
    this.store.set(model, rows);
    return this;
  }

  supports(model: string): boolean {
    return this.store.has(model);
  }

  async disconnect(): Promise<void> {
    // no-op
  }
}
