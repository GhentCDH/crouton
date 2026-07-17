import { type HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';

import { GhentCdhGuard } from '@ghentcdh/authentication-api';

@Injectable()
export class MelaGuard extends GhentCdhGuard {
  constructor(_httpService: HttpService, _configService: ConfigService) {
    super(_httpService, _configService);
  }
}
