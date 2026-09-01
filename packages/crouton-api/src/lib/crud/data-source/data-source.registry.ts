import { Injectable, type OnModuleDestroy } from '@nestjs/common';

import type { DataSourceAdapter } from './data-source.adapter';
import type { DataSourceEntry } from './data-source.types';

@Injectable()
export class DataSourceRegistry implements OnModuleDestroy {
  private readonly adapters = new Map<string, DataSourceAdapter>();
  private defaultName: string | undefined;

  constructor(entries: DataSourceEntry[]) {
    for (const entry of entries) {
      this.adapters.set(entry.config.name, entry.adapter);
      if (entry.config.default) {
        this.defaultName = entry.config.name;
      }
    }
    if (!this.defaultName && entries.length > 0) {
      this.defaultName = entries[0].config.name;
    }
  }

  resolveAdapter(name?: string): DataSourceAdapter {
    const key = name ?? this.defaultName;
    if (!key) throw new Error('No default data source configured');
    const adapter = this.adapters.get(key);
    if (!adapter) throw new Error(`Data source "${key}" not found in registry`);
    return adapter;
  }

  /** Returns the raw backend client for escape-hatch usage (`ctx.prisma`, action procedures). */
  resolveClient(name?: string): unknown {
    return this.resolveAdapter(name).client;
  }

  /**
   * Backward-compatible alias — returns the raw client, same as `resolveClient`.
   * Prefer `resolveAdapter` for new code.
   */
  resolve(name?: string): unknown {
    return this.resolveClient(name);
  }

  entries(): { name: string; adapter: DataSourceAdapter; client: unknown }[] {
    return [...this.adapters.entries()].map(([name, adapter]) => ({
      name,
      adapter,
      client: adapter.client,
    }));
  }

  async onModuleDestroy() {
    await this.disconnectAll();
  }

  /**
   * Disconnect every datasource. Called by `onModuleDestroy` and also by the
   * dev "restart backend" action before `process.exit()`.
   */
  async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.disconnect?.();
    }
  }
}
