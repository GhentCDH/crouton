import { Module } from '@nestjs/common';

import { CroutonApiModule } from '@ghentcdh/crouton-api';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    CroutonApiModule.forResourceDir(
      resolve(_dirname, 'resources'),
      resolve(_dirname, 'data-sources'),
      {
        baseUrl: '',
        title: 'Book Collection',
        enumsFile: resolve(_dirname, '..', '..', '..', '..', 'crouton.enums.json'),
      },
    ),
  ],
})
export class AppModule {}
