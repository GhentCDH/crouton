import { Injectable, type OnModuleDestroy } from '@nestjs/common';

import type { DataSourceEntry } from './data-source.types';

@Injectable()
export class DataSourceRegistry implements OnModuleDestroy {
  private readonly clients = new Map<string, any>();
  private defaultName: string | undefined;

  constructor(entries: DataSourceEntry[]) {
    for (const entry of entries) {
      this.clients.set(entry.config.name, entry.client);
      if (entry.config.default) {
        this.defaultName = entry.config.name;
      }
    }
    // If no explicit default, use the first entry.
    if (!this.defaultName && entries.length > 0) {
      this.defaultName = entries[0].config.name;
    }
  }

  get(name: string): any {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Data source "${name}" not found in registry`);
    }
    return client;
  }

  getDefault(): any {
    if (!this.defaultName) {
      throw new Error('No default data source configured');
    }
    return this.get(this.defaultName);
  }

  resolve(database?: string): any {
    return database ? this.get(database) : this.getDefault();
  }

  async onModuleDestroy() {
    for (const client of this.clients.values()) {
      if (typeof client.$disconnect === 'function') {
        await client.$disconnect();
      }
    }
  }
}
