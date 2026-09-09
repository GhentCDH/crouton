import type { DataSourceAdapter } from './data-source.adapter';

const DB_CHECK_TIMEOUT_MS = 3_000;

/**
 * Default adapter: wraps a generated PrismaClient.
 *
 * Phase 1: the lifecycle wrapper only. `ReadRepository`/`WriteRepository`
 * still construct themselves from `adapter.client` inside `createCrudRepository`.
 * Phase 2 will hoist their hook/decoration logic here.
 */
export class PrismaDataSourceAdapter implements DataSourceAdapter {
  readonly kind = 'prisma' as const;
  readonly client: unknown;

  constructor(prismaClient: unknown) {
    this.client = prismaClient;
  }

  supports(model: string): boolean {
    return typeof (this.client as any)?.[model] !== 'undefined';
  }

  async healthCheck(): Promise<void> {
    const c = this.client as any;
    await Promise.race([
      c.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database health check timed out')), DB_CHECK_TIMEOUT_MS),
      ),
    ]);
  }

  async disconnect(): Promise<void> {
    const c = this.client as any;
    if (typeof c?.$disconnect === 'function') {
      await c.$disconnect();
    }
  }
}
