import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DataSourceRegistry } from '../data-source';
import { ResourceConfigRegistry } from '../resource-config.registry';
import { buildStatus } from './status.service';

export const createStatusController = () => {
  @Controller('crouton')
  @ApiTags('Status')
  class StatusController {
    constructor(
      private readonly dataSourceRegistry: DataSourceRegistry,
      private readonly configRegistry: ResourceConfigRegistry,
    ) {}

    @Get('status.json')
    @ApiOperation({ summary: 'Crouton system status (db, resources, version)' })
    @ApiResponse({ status: 200, description: 'System status' })
    async getStatus() {
      const configs = await this.configRegistry.getAll();
      return buildStatus(this.dataSourceRegistry, configs);
    }
  }

  Reflect.defineMetadata(
    'design:paramtypes',
    [DataSourceRegistry, ResourceConfigRegistry],
    StatusController,
  );

  return StatusController;
};