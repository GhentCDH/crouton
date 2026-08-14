import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DataSourceRegistry } from '../data-source';
import { ResourceConfigRegistry } from '../resource-config.registry';
import { buildStatus } from './status.service';
import type { EnumRegistry } from '../enum-registry/enum-registry.types';

export const createStatusController = (enumRegistry: EnumRegistry) => {
  @Controller('crouton')
  @ApiTags('Status')
  class StatusController {
    constructor(
      public readonly dataSourceRegistry: DataSourceRegistry,
      public readonly configRegistry: ResourceConfigRegistry,
    ) {}

    @Get('status.json')
    @ApiOperation({ summary: 'Crouton system status (db, resources, version)' })
    @ApiResponse({ status: 200, description: 'System status' })
    async getStatus() {
      const configs = await this.configRegistry.getAll();
      return buildStatus(this.dataSourceRegistry, configs, enumRegistry);
    }
  }

  Reflect.defineMetadata(
    'design:paramtypes',
    [DataSourceRegistry, ResourceConfigRegistry],
    StatusController,
  );

  return StatusController;
};
